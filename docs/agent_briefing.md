# SpousePoints — Agent Briefing

**Audience:** An open-source coding agent (Claude Code, OpenDevin, or similar) with access to the repository.
**Goal:** Orient the agent to the codebase, describe known bugs with enough precision to locate their roots, define the testing environment that needs to be built, and give concrete entry points for each work stream.

---

## 1. What This App Is and What It Must Stay

SpousePoints is a PWA that lets couples award and request recognition points. The mechanism: one partner taps a button, the app builds a URL with encoded state, fires `sms:` to open Messages with that URL pre-composed in the body, the other partner taps the link, and their local app state updates. No accounts. No server. No database. Points live in `localStorage` on each device and are passed between devices as URL-encoded packets over SMS.

The architecture is a deliberate product constraint, not a limitation to engineer around. The app must remain:
- A single `index.html` file (all logic, style, and markup)
- Backend-free (no API calls except an optional future pair-code KV, which is not in scope here)
- SMS-native (the text message is the transport layer, not a notification mechanism)
- Local-first (points on each device are the source of truth, synced via exchange)

Any fix that requires a server, an account, or a database is out of scope for this work stream unless explicitly noted.

The hard constraint from the SPEC: **the app must never feel more "real" than the relationship.** Anything that makes points feel authoritative, permanent, or evidentiary is an anti-feature.

---

## 2. Architecture Snapshot

### File map

```
index.html       — All app logic, UI, and styles. ~2400 lines, ~74 KB. This is the only file you will edit.
sw.js            — Service worker. Handles PWA caching and lifecycle.
manifest.json    — PWA manifest (name, icons, display mode, start_url).
quips.yaml       — Editorial source for quip strings. Defaults are inlined in index.html; sync before deploy.
SPEC.md          — Product truth. Read before any feature work.
BUILD-v2.md      — Step-by-step build plan with a testing checklist.
ROADMAP-12w.md   — Pacing and gate criteria for the current release cycle.
docs/            — Additional planning docs.
```

### State model

Each device maintains its own `localStorage` state object. The canonical key is `sp_state` (verify in source). The object shape is approximately:

```js
{
  nameA: "Eric",        // this device's partner name
  nameB: "Spouse",      // the other partner's name
  scoreA: 12,           // this device's accumulated score
  scoreB: 8,            // other device's accumulated score
  pending: [],          // awards sent but not yet accepted
  ledger: [],           // history of completed recognitions
  categories: [...],    // editable category list
  // ... settings and UI prefs
}
```

**Device model:** Each install represents one partner. "You" are always Partner A on your device; your spouse is always Partner B. When the A/B packet crosses via SMS, the receiving device swaps the slot assignment before applying (Partner B's incoming scoreA becomes the local scoreB). This swap logic in `applyPacket()` is the most delicate part of the sync system.

### Sync model

```
Partner A taps award
  → buildSyncPacket()  — serializes current state + the award delta
  → buildShareURL()    — base64 or URI-encodes the packet into a URL hash (#state=...)
  → showToastThenSyncMessages()
  → openMessages()     — fires sms:&body=<url> (iOS) or sms:?body=<url> (Android)
  
Partner B receives SMS, taps link
  → browser opens spousepoints.lol/#state=<encoded_packet>
  → checkHashState()   — detects the hash on load
  → applyPacket()      — decodes, swaps A/B orientation, applies delta to local state, clears hash
  → renderUI()         — updates the scoreboard display
```

### PWA and caching

`sw.js` caches the app shell (index.html, manifest.json, icons). On iOS, the service worker scope is tied to the origin. The installed PWA has its own `localStorage` scope, separate from the same URL opened in Safari. This is a known iOS behavior, not a bug in the code, but it surprises users.

---

## 3. Known Bugs — Catalog

Each entry includes: description, root cause, files/functions to examine, and acceptance criteria for a fix.

---

### BUG-01 — Burst sends apply points multiple times

**Priority:** Critical — breaks the core loop.

**Description:** A power user taps the award button several times rapidly, or the flow stalls and they tap again. Each tap generates a new SMS. Each SMS contains a valid sync packet. If the receiving partner opens two or three of them, points are applied two or three times. There is currently no deduplication guard.

**Root cause:** Sync packets carry no identity. `applyPacket()` has no way to know it has already applied a given award. The ledger append and score increment happen unconditionally on every valid packet receipt.

**Where to look:**
- `buildSyncPacket()` — add a `txId` field here (8-char random string) and a `ts` field (Unix ms timestamp)
- `applyPacket()` — before applying, check `localStorage.getItem('sp_seen_tx')` for the incoming `txId`
- A secondary guard: compare incoming `ts` against the last-applied `ts`; if older, drop silently

**Suggested implementation:**

```js
// In buildSyncPacket — add before returning the packet object:
packet.txId = Math.random().toString(36).slice(2, 10);
packet.ts = Date.now();

// In applyPacket — add at the top:
const seen = JSON.parse(localStorage.getItem('sp_seen_tx') || '[]');
if (seen.includes(packet.txId)) return; // already applied, silent drop
seen.push(packet.txId);
if (seen.length > 100) seen.shift();   // keep list bounded
localStorage.setItem('sp_seen_tx', JSON.stringify(seen));

// Timestamp guard (belt and suspenders):
const lastTs = parseInt(localStorage.getItem('sp_last_ts') || '0', 10);
if (packet.ts <= lastTs) return;       // older than already-applied, drop
localStorage.setItem('sp_last_ts', String(packet.ts));
```

**Acceptance criteria:**
- Opening the same sync URL three times applies points exactly once
- The second and third applications are silently ignored (no toast, no error)
- The ledger contains exactly one entry per award
- A URL generated 30+ minutes ago that is opened after a newer packet has been applied is dropped

---

### BUG-02 — Points not saved / reset on refresh (new iPhone)

**Priority:** Critical — data loss.

**Description:** On at least one new iPhone, points do not persist across page refreshes. The app initializes with zero scores every time, as though localStorage is empty. The cause appears to be a silent failure in the localStorage read or write path — likely because Safari's tracking protection or Private Browsing mode causes `localStorage.setItem()` to throw synchronously, which crashes the initialization path before state is written.

**Root cause:** Uncaught synchronous exceptions from `localStorage` in constrained Safari environments. Also possible: the user is opening the URL in Safari while also having the app installed as a PWA — these are separate storage scopes, so state saved in one is invisible to the other.

**Where to look:**
- The app's init function (likely called on `DOMContentLoaded` or equivalent) — find where `localStorage.getItem('sp_state')` is called
- Any `localStorage.setItem()` call — look for bare calls with no `try/catch`

**Suggested implementation:**

```js
// Replace all bare localStorage calls with a safe wrapper:
const Storage = {
  _mem: {},  // in-memory fallback
  get(key) {
    try { return localStorage.getItem(key); }
    catch { return this._mem[key] ?? null; }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      this._mem[key] = value;
      return false;  // caller can check and show a warning
    }
  }
};

// Health check on init:
function checkStorageHealth() {
  const canary = '__sp_canary__';
  try {
    localStorage.setItem(canary, '1');
    const ok = localStorage.getItem(canary) === '1';
    localStorage.removeItem(canary);
    return ok;
  } catch { return false; }
}

// If checkStorageHealth() returns false, render a non-dismissable
// inline warning near the scoreboard:
// "Points may not save on this device. For best results, add to home screen."
```

**Acceptance criteria:**
- App initializes without throwing even in Safari Private Browsing
- A visible (non-toast, persistent) warning appears when storage is unavailable
- If storage is unavailable, in-memory state allows the session to function normally
- Warning message includes a suggestion to "Add to Home Screen"

---

### BUG-03 — Stale service worker serving old version; no user-facing update path

**Priority:** High — users on old code, no way to force update.

**Description:** The service worker caches the app shell. When a new version of `index.html` is deployed, users with an existing PWA installation continue to see the old version. The SW update lifecycle requires all tabs to be closed before a waiting worker activates. On mobile, where users often never close tabs, this means some users may run code weeks old. There is also no user-facing "new version available" signal or way to trigger an update without going into device settings.

**Root cause:** Standard service worker lifecycle behavior, unmitigated. No `skipWaiting()` call on install. No update detection in the page.

**Where to look:**
- `sw.js` — the `install` and `activate` event handlers; the cache name string (e.g., `cache-v1`)
- `index.html` — the service worker registration block (search for `navigator.serviceWorker.register`)

**Two changes needed:**

**In `sw.js`:**

```js
// 1. Version the cache name — change this string on every deploy
const CACHE_NAME = 'sp-v15';  // increment manually or automate in CI

// 2. On activate, delete old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 3. Listen for skip-waiting message from the page
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

**In `index.html` (in the SW registration block):**

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner();  // see below
        }
      });
    });
  });
  // Reload when new SW takes control
  navigator.serviceWorker.addEventListener('controllerchange', () => location.reload());
}

function showUpdateBanner() {
  // Render a small, persistent (non-toast) banner at the top of the page:
  // "A new version is ready. [Update now]"
  // On "Update now" click:
  navigator.serviceWorker.ready.then(reg => {
    reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
  });
}
```

**Also add to Settings panel:** A "Clear app cache" button that calls `navigator.serviceWorker.getRegistrations()`, unregisters all SWs, and reloads. This is the escape hatch for stuck installations.

**Acceptance criteria:**
- Deploying a new `index.html` causes users to see an update banner within one app open/foreground cycle
- Tapping "Update now" reloads to the new version without data loss
- Old caches are deleted on SW activation
- The Settings panel contains a working "Clear app cache" action
- Changing `CACHE_NAME` in sw.js is documented in a comment as a required deploy step

---

### BUG-04 — UI does not reflect new points without a manual refresh

**Priority:** High — adds a confusing interaction step.

**Description:** After following a sync link from SMS, the points are applied to localStorage. However, if the user then navigates back to the already-open PWA tab, the scoreboard still shows old values. The PWA does not know that localStorage was modified by another browsing context. The user must manually refresh the page to see updated scores.

**Root cause:** The app relies on lifecycle events (`visibilitychange`, `pageshow`, `focus`) to re-read localStorage on resume. These work within the same browser instance but do not fire reliably when returning from the Messages app (an OS-level app switch). Additionally, a `storage` event fires cross-tab within the same browser, but not across the browser-to-PWA boundary on iOS.

**Where to look:**
- `resumeSyncFromNavigation()` — the function mentioned in README as the lifecycle re-entry handler; find all the event listeners that call it
- The `pageshow` event handler — check for `event.persisted` (bfcache detection)
- `visibilitychange` handler — verify it calls `resumeSyncFromNavigation()` on transition to `visible`

**Suggested implementation:**

```js
// Ensure ALL four lifecycle paths call resumeSyncFromNavigation():

// 1. Returning from background (most reliable on iOS)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') resumeSyncFromNavigation();
});

// 2. Back-forward cache restore
window.addEventListener('pageshow', event => {
  if (event.persisted) resumeSyncFromNavigation();
});

// 3. Window focus (tab switching in desktop browsers)
window.addEventListener('focus', resumeSyncFromNavigation);

// 4. Cross-tab localStorage changes (same browser, different tabs)
window.addEventListener('storage', event => {
  if (event.key === 'sp_state') resumeSyncFromNavigation();
});

// resumeSyncFromNavigation() should:
// 1. Re-read localStorage
// 2. Compare against current rendered state
// 3. If different, update state object AND re-render the scoreboard
// 4. Show a brief "synced" indicator if scores changed
```

**The deeper fix — link behavior:** When a sync URL is followed, after `applyPacket()` runs, the page should clear the hash and redirect to the app root (`history.replaceState({}, '', '/')`) and then trigger a `storage` event or equivalent signal. If the PWA is already open in another context, it will catch the `storage` event and refresh. This closes the loop without requiring the user to manually return to a stale PWA.

**Acceptance criteria:**
- Returning to the PWA tab after following a sync link in Safari shows updated scores without a manual refresh
- The `storage` event handler correctly triggers a re-render when localStorage changes in another tab
- `resumeSyncFromNavigation()` is called by all four lifecycle paths above
- No double-applying of points when `resumeSyncFromNavigation()` fires on a tab that already has the latest state

---

### BUG-05 — SMS / Messages app does not reliably open

**Priority:** High — breaks the core loop for some users.

**Description:** On some devices, tapping the award button does not open Messages. The `sms:` URL scheme behavior varies across iOS versions, Android OEMs, and configured default messaging apps. Additionally, if the encoded state packet is long, the `sms:` URL body can be silently truncated by the OS, resulting in a broken or partial link on the receiving end.

**Root cause:**
1. iOS and Android use slightly different `sms:` URL formats
2. Long state packets (verbose key names, large ledger arrays) can exceed the OS's URL body limit (~2000 chars on iOS)
3. No fallback UX when `sms:` silently fails on mobile

**Where to look:**
- `openMessages()` — the function that constructs and fires the `sms:` URL
- `buildSyncPacket()` — examine what's being included in the packet and how large it can grow
- `buildShareURL()` — examine the encoding method (base64 vs `encodeURIComponent`)

**Fixes required:**

**Fix 1 — Platform-aware URL format:**
```js
function getSmsUrl(body) {
  const encoded = encodeURIComponent(body);
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return `sms:&body=${encoded}`;
  if (/Android/i.test(ua))           return `sms:?body=${encoded}`;
  return null; // desktop or unknown — use copy fallback
}
```

**Fix 2 — Packet size reduction:**
Rename verbose keys in the sync packet to short aliases before encoding. Only include the delta and current totals; do not include the full ledger array in the URL packet (the ledger is display-only and can stay local).

```js
// Instead of:
{ scoreA: 12, scoreB: 8, pending: [...], delta: 3, category: "...", reason: "..." }
// Use:
{ a: 12, b: 8, d: 3, cat: "...", why: "...", txId: "abc123", ts: 1234567890 }
```

**Fix 3 — Length guard with hard fallback:**
```js
function openMessages(url) {
  const smsUrl = getSmsUrl(url);
  if (!smsUrl || smsUrl.length > 1800) {
    // Fall through to copy-to-clipboard UI immediately
    showCopyFallback(url);
    return;
  }
  window.location.href = smsUrl;
  // On mobile, if we're still here after 1.5s, sms: didn't open
  setTimeout(() => showCopyFallback(url), 1500);
}
```

**Fix 4 — Copy fallback UX:** The copy-to-clipboard fallback should be a first-class path on mobile, not a hidden escape hatch. When `sms:` fails or the user is on desktop, show:
- A clearly labeled copy button ("Copy and send to [Name]")
- The URL itself in a tappable/selectable text field
- Brief instruction: "Paste this in a text to [Name]"

**Acceptance criteria:**
- On iOS 16+, the Messages app opens with the body pre-populated
- On a tested Android device, the default SMS app opens with the body pre-populated
- If the `sms:` URL exceeds 1800 characters, the copy fallback is shown automatically
- If `sms:` does not open within 1.5 seconds on mobile, the copy fallback is shown
- Encoded packet size for a standard award is under 500 characters (verify with `console.log(syncUrl.length)`)

---

## 4. Testing Environment to Build

The goal is a test suite that can be run in CI without real devices or real SMS sending. The SMS seam (whether Messages.app actually opens) is tested manually with a volunteer device matrix.

### 4.1 — Extract pure functions into a testable module

The core logic in `index.html` is written as inline functions in a `<script>` block. For testing, the following functions need to be extractable or at least callable from a test harness:

- `buildSyncPacket(state, delta)`
- `buildShareURL(packet)`
- `applyPacket(encodedPacket, currentState)` — returns new state, does not write localStorage directly (refactor if needed)
- `checkHashState()` — parses `window.location.hash` and calls `applyPacket`
- The deduplication guard (once written per BUG-01)
- `checkStorageHealth()` (once written per BUG-02)

**Option A (preferred, minimal refactor):** Add a `window.__sp = { buildSyncPacket, applyPacket, buildShareURL }` export object at the bottom of the `<script>` block. Test runners (Playwright) can call `page.evaluate(() => window.__sp.buildSyncPacket(...))` without restructuring the file.

**Option B:** Extract the pure functions into a `lib.js` file that `index.html` includes via `<script src="lib.js">`. Tests import `lib.js` directly via Node/Vitest. This is cleaner but requires more surgery on the existing file structure.

Start with Option A.

### 4.2 — Unit test suite (Vitest or plain Node)

**File:** `tests/unit/core.test.js`

Tests to write (in priority order):

```js
// 1. Packet round-trip
test('buildSyncPacket + buildShareURL + applyPacket round-trips correctly', ...)

// 2. A/B orientation swap
test('applyPacket swaps A/B scores when partner sends state', ...)

// 3. Idempotency guard
test('applyPacket ignores a packet with a previously seen txId', ...)
test('applyPacket ignores a packet older than the last applied ts', ...)

// 4. Burst send: only newest applies
test('three rapid packets with same delta apply points exactly once', ...)

// 5. Corrupt packet handling
test('applyPacket does not throw on malformed base64 input', ...)
test('applyPacket does not throw on missing required fields', ...)

// 6. URL length
test('buildShareURL output for a standard award is under 500 chars', ...)
test('buildShareURL output never exceeds 1800 chars regardless of ledger size', ...)

// 7. Storage health check
test('checkStorageHealth returns false when localStorage throws', ...)
```

### 4.3 — Browser integration tests (Playwright)

**File:** `tests/integration/flow.spec.js`

The SMS handoff is simulated by extracting the sync URL from one browser context and navigating a second context to it directly. No actual SMS is sent.

**Setup:**

```js
// playwright.config.js
module.exports = {
  testDir: './tests/integration',
  use: {
    baseURL: 'http://localhost:8080',  // serve index.html locally
    // Emulate iPhone 15 for Partner A, Android for Partner B
  },
  projects: [
    { name: 'partnerA', use: { ...devices['iPhone 15'] } },
    { name: 'partnerB', use: { ...devices['Pixel 7'] } },
  ]
};
```

**Tests to write (in priority order):**

```js
// Test 1: Basic award flow
test('Partner A awards 3 points → Partner B receives them', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const pageA = await ctxA.newPage();
  const pageB = await ctxB.newPage();

  await pageA.goto('/');
  // Set names, select category, click award...
  // Intercept the generated sync URL:
  const syncUrl = await pageA.evaluate(() => window.__sp?.lastSyncUrl);
  // Partner B navigates to it:
  await pageB.goto(syncUrl);
  // Assert scores:
  const state = await pageB.evaluate(() => JSON.parse(localStorage.getItem('sp_state')));
  expect(state.scoreB).toBe(3);
});

// Test 2: Idempotency — opening same URL three times
test('Opening a sync URL three times applies points once', async ({ page }) => {
  const syncUrl = '<captured from Test 1>';
  await page.goto(syncUrl);
  await page.goto(syncUrl);
  await page.goto(syncUrl);
  const state = await page.evaluate(() => JSON.parse(localStorage.getItem('sp_state')));
  expect(state.scoreB).toBe(3);  // not 9
});

// Test 3: Stale URL rejection
test('A sync URL older than latest-applied ts is dropped', async ({ page }) => {
  // Apply a packet with ts=1000
  // Then try to apply a packet with ts=500
  // Score should not change on the second application
});

// Test 4: Storage unavailable
test('App renders without throwing when localStorage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() { throw new DOMException('SecurityError'); }
    });
  });
  await page.goto('/');
  // Should not show a JS error; should show a storage warning
  await expect(page.locator('[data-storage-warning]')).toBeVisible();
});

// Test 5: Service worker update banner
test('Update banner appears when a new SW is waiting', async ({ page }) => {
  // Register a mock updated SW, assert banner is visible
});

// Test 6: Lifecycle refresh
test('Scoreboard re-renders when localStorage changes in another tab', async ({ browser }) => {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  // ctxA has app open; ctxB applies a sync URL; assert ctxA scoreboard updates
});
```

### 4.4 — Local development server

The app is currently served via GitHub Pages from the repo root. For local testing:

```bash
# Option A: Python (no install needed)
python3 -m http.server 8080

# Option B: npx serve (requires Node)
npx serve . -p 8080

# Option C: add a dev script to package.json (create one if it doesn't exist)
# "scripts": { "dev": "npx serve . -p 8080", "test": "npx vitest" }
```

The service worker will only activate over HTTPS or localhost. Local testing on `localhost:8080` is sufficient for SW testing.

### 4.5 — Manual device matrix (real SMS testing)

This layer cannot be automated. Document results in `docs/device-matrix.md`:

| Test | iPhone A (sender) | iPhone B (receiver) | Result |
|------|------------------|---------------------|--------|
| Messages opens | ✓/✗ | — | |
| Body pre-populated | ✓/✗ | — | |
| Link tappable | — | ✓/✗ | |
| Points applied | — | ✓/✗ | |
| Ledger entry created | — | ✓/✗ | |

Run the matrix for: iPhone/iPhone, iPhone/Android, Android/Android, Android/iPhone.

---

## 5. Breadcrumbs — Where to Begin

Work items are ordered by impact. Each entry tells the agent what to look for first.

### Step 1 — Read the source (15 minutes)

Open `index.html`. Search for these strings to map the key landmarks:

- `buildSyncPacket` — find its definition; understand what goes into the packet object
- `applyPacket` — find its definition; trace what it reads from and writes to localStorage
- `openMessages` — find how the `sms:` URL is constructed and fired
- `localStorage.getItem` — note every call site; these are the storage access points
- `serviceWorker.register` — find the SW registration block
- `resumeSyncFromNavigation` — find all event listeners that call this
- `checkHashState` — find where the hash is parsed on load

Write down the approximate line numbers. The README confirms these functions exist; the task is locating them in the file.

### Step 2 — BUG-01 (idempotency) — highest impact, lowest risk

Modify `buildSyncPacket()` to add `txId` and `ts` fields.
Then modify `applyPacket()` to check `sp_seen_tx` in localStorage before applying.
Write a unit test first (see Section 4.2, tests 3 and 4), then implement the fix.
This change is additive and does not touch rendering, SMS, or the SW.

### Step 3 — BUG-02 (storage guard) — protects all other state work

Write the `Storage` wrapper and `checkStorageHealth()` function.
Replace bare `localStorage` calls with `Storage.get()` / `Storage.set()`.
Add the `data-storage-warning` DOM element and show it when health check fails.
Write the Playwright test 4 (Section 4.3) to verify the guard works.

### Step 4 — BUG-05 (SMS reliability) — core loop

Examine `openMessages()` and the packet serialization.
Measure the current URL length by adding a temporary `console.log(syncUrl.length)`.
Apply the platform-detection fix and the length guard with copy fallback.
Test manually on at least one iOS and one Android device.

### Step 5 — BUG-04 (stale UI) — lifecycle

Audit all event listeners that call `resumeSyncFromNavigation()`.
Add any missing ones from the list in Section 3, BUG-04.
Add the `storage` event listener.
Write Playwright test 6 to verify cross-tab state propagation.

### Step 6 — BUG-03 (SW update) — housekeeping

Update `sw.js` per the patterns in Section 3, BUG-03.
Add the update banner to `index.html`.
Add the "Clear app cache" button to the Settings panel.
Write Playwright test 5 to verify the banner appears.

### Step 7 — Export/import state

After the above bugs are fixed, add to Settings:
- "Save my points" → `JSON.stringify(localStorage.getItem('sp_state'))` → copy to clipboard
- "Restore points" → paste JSON → validate shape → write to localStorage → reload

This solves the "new phone" use case without any server.

---

## 6. Constraints for the Agent

- **Do not add a backend.** Any fix that requires an API endpoint, a database, or a new service is out of scope.
- **Do not restructure the file layout.** `index.html` stays as the single application file. Adding `lib.js` for testability is acceptable only if `index.html` remains the user-facing entry point and works identically when served directly.
- **Do not add build tooling.** No webpack, no Vite, no transpilation. The app is intentionally zero-dependency on the build side. Vitest for unit tests is acceptable as a dev dependency. Playwright for integration tests is acceptable.
- **Do not modify `quips.yaml` unless fixing a bug related to quips.** Editorial content is out of scope for this work stream.
- **Do not change the product model.** Points are not points; they are recognitions. The ledger is not evidence. If a fix makes the app feel more authoritative or permanent than the relationship, it should not ship.
- **Preserve the A/B orientation swap logic in `applyPacket()`.** This is the most nuanced part of the codebase. Any refactor of this function needs to pass a round-trip test with an orientation-swap assertion.
- **All user-visible copy changes must match the "caveman copy" principle** established in the ROADMAP: plain one-step language, no philosophy, no manifesto.

---

## 7. Open Questions (Do Not Resolve Without a Decision)

These are design questions, not bugs. Do not implement solutions to them; flag them if you encounter them.

1. **Multi-select awards (beta flag):** The feature exists behind a flag. Its interaction with the deduplication guard (BUG-01) is unclear. Does one "select + award" action produce one packet or many?

2. **Ledger size in sync packets:** The current packet may or may not include the full ledger. If it does, this is the primary contributor to URL length (BUG-05). The fix may require separating "sync data" (totals + delta + txId) from "display data" (ledger), with the ledger living only locally. This is an architectural decision, not a one-line fix.

3. **Pair-code cloud sync:** Future feature, explicitly out of scope for this work stream. Do not design or stub it. Record its existence in `SPEC.md` if it's not already there.

4. **Android default SMS app diversity:** Some Android devices have Samsung Messages as default; others use Google Messages; others use carrier apps. The `sms:` scheme behavior differs. A definitive compatibility table requires real device testing the agent cannot do.
