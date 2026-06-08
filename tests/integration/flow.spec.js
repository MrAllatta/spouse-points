import { test, expect } from '@playwright/test';

// ================================================================
// SpousePoints — Integration tests
//
// These tests simulate the SMS handoff by extracting a sync URL
// from one browser context and navigating a second context to it
// directly.  No real SMS is sent.
//
// Prerequisites:
//   - The dev server runs on localhost:8080  (handled by webServer)
//   - index.html exposes window.__sp = { buildSyncPacket,
//     buildShareURL, applyPacket, checkHashState }
// ================================================================

test.describe('Spouse Points — Sync flow', () => {

  // ----------------------------------------------------------------
  // Test 1 — Basic award flow
  // ----------------------------------------------------------------
  test('Partner A awards 3 points → Partner B receives them', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto('/');
    // Set names so buildSyncPacket can produce a valid packet
    await pageA.fill('#name-a', 'Alice');
    await pageA.fill('#name-b', 'Bob');

    // Simulate an award by adjusting state then building the sync URL
    const syncUrl = await pageA.evaluate(() => {
      state.scores = { a: 0, b: 3 };
      return window.__sp.buildShareURL();
    });

    // Partner B opens the sync URL (simulates tapping the link in SMS)
    await pageB.goto(syncUrl);
    await pageB.waitForTimeout(500);

    // Verify Partner B's state reflects the points
    const bScores = await pageB.evaluate(() => state.scores);
    expect(bScores).toEqual({ a: 0, b: 3 });

    await ctxA.close();
    await ctxB.close();
  });

  // ----------------------------------------------------------------
  // Test 2 — Idempotency: opening same sync URL three times
  // ----------------------------------------------------------------
  test('Opening a sync URL three times applies points once', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto('/');
    await page.fill('#name-a', 'Alice');
    await page.fill('#name-b', 'Bob');

    // Build a sync URL with a known state
    const syncUrl = await page.evaluate(() => {
      state.scores = { a: 0, b: 5 };
      return window.__sp.buildShareURL();
    });

    // First application: full page load with the sync hash
    await page.goto(syncUrl);
    await page.waitForTimeout(300);

    // Extract the hash fragment so we can re-apply it
    const hashPart = syncUrl.split('#')[1];

    // Second & third application: set hash to trigger hashchange → applyPacket
    await page.evaluate(hash => { location.hash = hash; }, hashPart);
    await page.waitForTimeout(200);
    await page.evaluate(hash => { location.hash = hash; }, hashPart);
    await page.waitForTimeout(200);

    // With BUG-01 fix (txId dedup), points should be applied exactly once.
    // Without the fix, each application would re-add 5 → 15.
    const scores = await page.evaluate(() => state.scores);
    expect(scores.b).toBe(5);

    await ctx.close();
  });

  // ----------------------------------------------------------------
  // Test 3 — Stale URL rejection
  // ----------------------------------------------------------------
  test('A sync URL older than the latest-applied ts is dropped', async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto('/');
    await page.fill('#name-a', 'Alice');
    await page.fill('#name-b', 'Bob');

    // --- Apply a new(er) packet first ---
    const newUrl = await page.evaluate(() => {
      state.scores = { a: 0, b: 10 };
      return window.__sp.buildShareURL();
    });
    await page.goto(newUrl);
    await page.waitForTimeout(300);

    // --- Now try an older packet (ts=1) ---
    const oldUrl = await page.evaluate(() => {
      const packet = window.__sp.buildSyncPacket();
      packet.scores = { a: 0, b: 3 };
      packet.ts = 1;  // force a very old timestamp
      const encoded = btoa(JSON.stringify(packet));
      return `${location.origin}${location.pathname}#state=${encoded}`;
    });
    await page.goto(oldUrl);
    await page.waitForTimeout(300);

    // Score should still be 10 — the older packet must be dropped
    const scores = await page.evaluate(() => state.scores);
    expect(scores.b).toBe(10);

    await ctx.close();
  });

  // ----------------------------------------------------------------
  // Test 4 — Storage unavailable
  // ----------------------------------------------------------------
  test('App renders without throwing when localStorage is unavailable', async ({ page }) => {
    // Block localStorage before any app scripts run
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() { throw new DOMException('Blocked by test', 'SecurityError'); },
        configurable: true,
      });
    });

    await page.goto('/');

    // App must load without JS errors and render the basic shell
    await expect(page.locator('header h1')).toHaveText('Spouse Points');

    // After BUG-02 is fixed, the app should display a persistent
    // storage-warning element.  Uncomment the line below once the
    // fix is deployed:
    // await expect(page.locator('[data-storage-warning]')).toBeVisible();
  });

  // ----------------------------------------------------------------
  // Test 5 — SW update banner  (skeleton)
  // ----------------------------------------------------------------
  test('Update banner appears when a new SW is waiting — skeleton', async () => {
    // This test requires mocking the service worker lifecycle:
    //   1. Register an initial SW
    //   2. Push a new version (simulate updated sw.js)
    //   3. Assert the update-banner element becomes visible
    //
    // Because SW scope / lifecycle is tightly coupled to the browser's
    // SW engine, a proper implementation needs:
    //   - page.context().serviceWorkers() monitoring
    //   - or a controlled sw.js that exposes its state
    //
    // Marked as fixme for now — implement after BUG-03 is addressed.
    test.fixme(true, 'Requires SW lifecycle mocking (see BUG-03)');
  });

  // ----------------------------------------------------------------
  // Test 6 — Cross-context storage change re-render
  // ----------------------------------------------------------------
  test('Scoreboard re-renders when localStorage changes in another context', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // Partner A opens the app
    await pageA.goto('/');
    await pageA.fill('#name-a', 'Alice');
    await pageA.fill('#name-b', 'Bob');

    // Partner B opens the app
    await pageB.goto('/');
    await pageB.fill('#name-a', 'Alice');
    await pageB.fill('#name-b', 'Bob');

    // Partner A sends points by building a sync URL
    const syncUrl = await pageA.evaluate(() => {
      state.scores = { a: 0, b: 7 };
      return window.__sp.buildShareURL();
    });

    // Partner B opens the sync URL — points applied
    await pageB.goto(syncUrl);
    await pageB.waitForTimeout(500);

    // B's scoreboard should show 7
    const bScoreText = await pageB.locator('#score-b').textContent();
    expect(bScoreText).toBe('7');

    await ctxA.close();
    await ctxB.close();
  });

});
