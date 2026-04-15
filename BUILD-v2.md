# Spouse Points — V2 Build Plan

**Goal:** URL-as-state sync via text message. Installable PWA. No backend.  
**Target:** Shippable by end of weekend, postable Monday.  
**Constraint:** Single HTML file preferred. No build tooling, no npm, no framework.

**Product stance (do not skip when implementing):** Numeric scores and `pointValues` exist for **sync and clarity**, not to crown a winner. Prefer **ledger + message body** as the emotional surface; avoid adding extra number chrome without cause. **Absurd or non-comparable values** (e.g. birth) are intentional — they break fungible “we’re seriously counting” energy. Full debate and open questions: `SPEC.md` (*Debate: Scoreboard numbers…*, *Seasonal labor…*, Open Question **7**).

**Single-owner install (each PWA):** Partner **A** = the human whose phone it is; Partner **B** = their spouse. **Awards always credit B**; **requests always come from A**. There is **no** main-screen control to impersonate the other partner - you send to them via Messages, they maintain the same two totals on their copy. Settings on each device label A as “you” and B as “your spouse.” When a `#state=` packet arrives, `index.html` may **swap incoming `a`/`b`** for scores and flip `pending[].requester` if the sender’s `names` order is opposite the receiver’s (packet names stay for SMS legibility + orientation; **local name fields are not overwritten** from the link). Full write-up: `SPEC.md` (*Core Mechanics*, *Persistence & Device Model*).

---

## What V1 Already Has

- Award and request flows with categories and quips
- Pending queue with Award/Pass resolution
- Ledger with entry tagging
- localStorage persistence
- Fixed categories including Dishes (2pts) and Gave Birth (1,000,000pts)
- Copyright footer

---

## Progress (`index.html` as of 2026-04-13)

| Step | Topic | Status |
|------|--------|--------|
| 1 | Fixed `pointValues` | Shipped |
| 2 | `#state=` encode / decode / strip hash | Shipped |
| 3 | SMS handoff on spontaneous award | Shipped |
| 4 | SMS handoff on request | Shipped |
| 5 | SMS handoff when partner awards pending | Shipped |
| 6 | Pass = silent (no ledger / no message) | Shipped |
| 7 | Award multiplier 1× / 2× / 3× | Shipped |
| 8 | Settings panel (names + point overrides) | Shipped |
| 9 | Category CRUD in Settings | Shipped |
| 10 | PWA (installable) | Shipped |
| 11 | Lifecycle re-entry for `#state=` (Messages / resume / bfcache) | Planned |

---

## Build Steps

### Step 1 — Fixed point values per category
**Replace random 1–3 with a lookup table.**

Add a `pointValues` map keyed by category key:
```js
const pointValues = {
  cooked: 3, cleaned: 3, kids: 4, groceries: 3,
  nosigh: 2, tongue: 3, coffee: 1, bed: 1,
  listened: 4, phone: 2, dishes: 2, birth: 1000000,
  custom: 2,
};
```
Replace `1 + Math.floor(Math.random() * 3)` with `pointValues[key] ?? 2` in both `awardPoints()` and `resolveRequest()`.

**Done when:** awarding "Made coffee" always gives 1, "Gave birth" always gives 1,000,000.

---

### Step 2 — URL state encoding/decoding

Add two utility functions:

```js
function buildSyncPacket() {
  return {
    v: 1,
    scores: state.scores,
    names: {
      a: document.getElementById("name-a").value,
      b: document.getElementById("name-b").value,
    },
    pending: state.pending,
    ts: Date.now(),
  };
}

function buildShareURL() {
  const encoded = btoa(JSON.stringify(buildSyncPacket()));
  return `${location.origin}${location.pathname}#state=${encoded}`;
}

function applyPacket(packet) {
  if (!packet || packet.v !== 1) return false;
  // Production also swaps a/b for scores + pending when packet.names
  // disagree with local “A = me, B = spouse” — see index.html / SPEC.md.
  state.scores = packet.scores;
  state.pending = packet.pending || [];
  document.getElementById("score-a").textContent = state.scores.a;
  document.getElementById("score-b").textContent = state.scores.b;
  syncNames();
  renderPending();
  saveState();
  return true;
}
```

`applyPacket` updates **scores and pending** from the URL; **local ledger (`state.history`) is unchanged** so the device keeps its private archive (`SPEC.md` merge behavior). **Names in Settings stay local** (A = you, B = spouse on this install); the packet’s `names` are used to detect whether incoming `a`/`b` need a **swap** relative to this phone. Production `index.html` implements that swap + pending `requester` flip; the snippet below is the minimal merge — extend per `SPEC.md` *Persistence & Device Model*.

Add to `init()` — check for hash on load, apply and clear:
```js
function checkHashState() {
  if (!location.hash.startsWith("#state=")) return;
  try {
    const packet = JSON.parse(atob(location.hash.slice(7)));
    if (applyPacket(packet)) maybeShowSyncOnboardingToast(packet);
  } catch (e) {}
  history.replaceState(null, "", location.pathname);
}
```

`applyPacket` returns **`true`** when the packet was applied, **`false`** when ignored (bad version / shape). `maybeShowSyncOnboardingToast` runs only on success: prompts **Settings** if local names are still placeholders or empty, or if packet `names` cannot be reconciled with local You/Spouse strings (see `SPEC.md` *Onboarding toast after a link*). Production copy lives in `index.html` (`showInfoToast`, `.toast-onboarding`).

**Done when:** generating a URL, opening it in a second browser tab, and seeing the correct scores and pending state load; with default names still in place, an onboarding-style toast appears once per link open until names are set.

### Patch plan — lifecycle re-entry for `#state=` (Messages / PWA)

**Problem:** `SPEC.md` field note (2026-04-14) — after a partner sends a sync URL in Messages, the recipient can land on a **foreground app** whose **scoreboard still shows old totals** until a manual full refresh.

**Cause (current `index.html`):** `checkHashState()` is invoked from `init()` **once** at first script run. Mobile reuse of an existing tab or standalone shell, return from Messages without a cold navigation, or **bfcache** (`pageshow` with `event.persisted`) can skip that boot path even when `#state=` is present or `localStorage` already reflects a merged packet.

**Goal:** Re-run the same **idempotent** apply / render path whenever the document becomes relevant again — **without** `location.reload()` as the default behavior.

**Implementation outline (single-file constraint):**

1. **One resume entrypoint** — e.g. `resumeSyncFromNavigation()` that:
   - If `location.hash` starts with `#state=`, run the same logic as today’s `checkHashState()` (decode → `applyPacket` → `maybeShowSyncOnboardingToast` on success → strip hash via `history.replaceState`).
   - If there is **no** `#state=` on this activation, optionally **rehydrate scores + pending from `localStorage`** and refresh their DOM (`score-a` / `score-b`, `renderPending()`), so a merge that happened while the page was frozen still paints. Prefer a **narrow** helper over duplicating all of `loadState()` unless audit shows `loadState()` is safe to call on every `visibilitychange` (watch for fighting in-flight Settings edits, micro-moment state, and double DOM work).
2. **Subscribe once after `init()` baseline:**
   - `window.addEventListener("pageshow", (ev) => { if (ev.persisted) resumeSyncFromNavigation(); })` for **bfcache** restores.
   - `window.addEventListener("hashchange", resumeSyncFromNavigation)` for fragment updates without a full load.
   - `document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") resumeSyncFromNavigation(); })` for return from Messages / app switcher. If `pageshow` + `visibilitychange` double-fire, rely on idempotency: second call should no-op once hash is cleared / `applyPacket` returns false for stale `ts`.
3. **Do not weaken** `lastAppliedPacketTs` stale guard inside `applyPacket`. Keep onboarding toast tied to **`applyPacket` returned `true`** on that invocation so duplicate events do not stack toasts.
4. **Optional short-lived logging** (commented or behind a throwaway flag) while validating iOS standalone vs Safari; remove before calling the patch done.

**QA / done when:**

- **iOS matrix:** Safari tab **and** Home Screen standalone — app **already in background**, tap new incoming link in Messages → scores + pending match a **decoded** packet within ~1s of foreground **without** manual refresh.
- **Desktop Chrome:** navigate away and **Back** to a bfcached document → UI still matches storage after resume.
- **Regression:** cold `init()` path unchanged; burst / **newest-`ts`-wins** tests in this doc still pass.

**Related spec:** `SPEC.md` *Field note (2026-04-14): stale scoreboard after link from Messages*.

---

### Step 3 — Messages handoff on spontaneous award

Replace the end of `awardPoints()` with: show the toast (quip stays in-app only), then open Messages on mobile with text that matches `SPEC.md` **Core Mechanics → Award Points**: the draft leads with **points**, **recipient**, and **what was noticed** (category + optional detail), then the **sync link** — **not** the quip (quips are for toast / energy; the thread stays a legible record).

```js
function openMessages(precomposedText) {
  const encoded = encodeURIComponent(precomposedText);
  window.location.href = `sms:?body=${encoded}`;
}
```

Example body (adjust to your string helpers):

```js
const url = buildShareURL();
const notice = whatNoticed.trim(); // category + optional custom detail
const body = notice
  ? `+${points} to ${recipientName} — ${notice} ${url}`
  : `+${points} to ${recipientName} ${url}`;
```

**Note:** `sms:` works on iOS and Android. On desktop it fails gracefully — show the share URL in the toast (e.g. replace or append `toast-quip` text) so it can be copied.

```js
const isMobile = /iPhone|Android/i.test(navigator.userAgent);
if (isMobile) {
  openMessages(body);
} else {
  document.getElementById("toast-quip").textContent = url;
}
```

**Ledger / SMS hierarchy:** Prefer the same ordering as the ledger’s primary line: recipient + what was noticed + points where it reads naturally; see `SPEC.md` *Ledger vs. quips*.

**Done when:** awarding points on mobile opens Messages with a pre-filled body that includes what was noticed and the sync link, with no quip in the SMS.

---

### Step 4 — Messages handoff on request

At the end of `requestPoints()`, after pending is updated and saved, use the same mobile/desktop split as Step 3. Pre-composed text should read as the **request** (what they did / want noticed), then the link — aligned with `SPEC.md` examples (e.g. category + 👀 + link).

```js
const url = buildShareURL();
const isMobile = /iPhone|Android/i.test(navigator.userAgent);
if (isMobile) {
  setTimeout(() => {
    openMessages(`${label} 👀 ${url}`);
  }, 450);
} else {
  document.getElementById("toast-quip").textContent = url;
}
```

Variant with explicit credit framing:

```js
openMessages(`Credit where it's due: ${label} 👀 ${url}`);
```

**Done when:** tapping "Request Points" on mobile opens Messages with the request text and sync link.

---

### Step 5 — Messages handoff when partner awards a pending request

In `resolveRequest(id, 'award')`, after scores and ledger update, mirror Step 3: toast first, then `openMessages` with **updated** `buildShareURL()` so the requester gets the new scores/pending in one tap. This is the **return** leg in `SPEC.md` (*Request Points* → “celebration text auto-sends… with updated sync link”).

Use the same SMS template as spontaneous award (points, recipient, what was noticed from the pending item’s label/category, then link; no quip in SMS).

**Done when:** resolving “Award it” on mobile opens Messages with celebration-style copy and the new sync link; desktop shows the URL in the toast.

---

### Step 6 — Pass is silent dismiss

In `resolveRequest()`, remove any `passed` ledger entry. Pass splices the request from `state.pending`, calls `renderPending()` and `saveState()`. No message, no history entry, no toast.

The dismiss button label: **“Not this one”** (see `SPEC.md` Open Question **5**).

**Done when:** passing a request clears it from pending with no outbound message and no ledger entry.

---

### Step 7 — Award multiplier (1× / 2× / 3×)

Add a multiplier toggle to the award section UI — three small buttons, default 1×:

```html
<div class="multiplier-toggle" id="multiplier-row">
  <button class="mult-btn active" data-mult="1" onclick="setMultiplier(1)">1×</button>
  <button class="mult-btn" data-mult="2" onclick="setMultiplier(2)">2×</button>
  <button class="mult-btn" data-mult="3" onclick="setMultiplier(3)">3×</button>
</div>
```

Add `state.multiplier = 1`. In `awardPoints()`: multiply the resolved per-category points by the multiplier, e.g. `const points = pointsForKey(key) * state.multiplier` once Step 8’s `pointsForKey` exists (before that: `pointValues[key] * state.multiplier`).  
Reset multiplier to 1 after each award in `clearForm()`.

Hide the multiplier row when in Request mode (multiplier doesn't apply to requests).

**Done when:** selecting 2× doubles the awarded points; multiplier resets after each award.

---

### Step 8 — Settings panel

A slide-up panel (not a separate page) triggered by a gear icon in the header.

Contents:
- Partner name fields: **Partner A = you on this phone**, **Partner B = your spouse** (each install; see *Single-owner install* above). Names are sent in the sync packet but are **not** applied over local fields on link open.
- Point value overrides: number input per category, pre-filled with defaults

**Do not ship** a user-facing **reset scores** or **wipe ledger** in this panel for v1/v2 (`SPEC.md` *Design choice: In-app reset* and *Settings Page*). Starting over is **OS-level** site-data clear / uninstall — intentional friction.

```html
<div class="settings-panel" id="settings" style="display:none">
  <h2>Settings</h2>
  <!-- name fields -->
  <!-- point value inputs -->
  <button onclick="closeSettings()">Done</button>
</div>
```

Store custom point values in `state.customPoints = {}`. In `awardPoints()`, lookup order: `state.customPoints[key] ?? pointValues[key] ?? 2`.

Custom point values go into `saveState()` / `loadState()`. They do **not** go into the sync packet — each partner can have their own opinion about defaults, and the sync packet is about state not configuration.

**Done when:** changing "Made coffee" to 3 in settings persists across reloads and applies to new awards.

---

### Step 9 — Category CRUD in Settings

**Build order:** **After Step 8**, **before Step 10 (PWA).** Step 8 establishes the settings shell, persistence, and “config stays local” rules; this step extends that surface. PWA does not depend on it, but shipping category editing before install reduces “first open from home screen” friction and keeps one settings pass for QA.

**Goal:** Couples can **add, edit, reorder, and remove** categories from the award/request grid without editing source. Aligns with `SPEC.md` (*Seasonal labor…* / *Politics of defaulting*) — defaults are a starting caricature; the list is **theirs**.

**Data model (suggested):**
- Keep shipped defaults as **fallback seeds** (e.g. `DEFAULT_CATEGORIES` + `DEFAULT_POINT_VALUES` + default `quips` in code or loaded once).
- Runtime list: `state.categories` — array of `{ key, emoji, label }` with stable `key` (slug/id) for storage and pending references.
- `state.customPoints` continues to key off `key`; deleting a category removes its override row; unknown keys in old data fall back safely.
- **Quips:** Minimum viable: new user-added categories use the **`custom` quip pool** until/unless we add per-category quip editing (defer or scope as “v2.1” if too large). Document in SPEC.

**Settings UI (extend Step 8 panel):**
- List of categories with: emoji, label, default points (reuse point override or single “points” field per row), drag handle or up/down for **reorder**, **Edit**, **Delete**.
- **Add category** — generates a unique `key` (e.g. `custom_<timestamp>` or slug from label + collision suffix).
- **Delete** — if any **pending** request references `key`, block delete with a short message (“Resolve or pass waiting requests first”) *or* allow delete and treat pending rows as legacy `custom` (pick one; blocking is simpler and safer).
- Ledger history stores human-readable **labels** already; old rows stay readable after rename/delete.

**Sync packet:** Same stance as point overrides — **category catalog is not in `#state=`** (URL size, version churn). Each device owns its grid. **Pending items already carry** `label` (and `category` key); partner awarding uses resolver’s `pointsForKey(key)` and quip fallback (`custom`) if their device has no row for that key. Document in SPEC.

**Done when:** User adds a category with emoji + label + points; it appears in the grid; awards use those points; reorder persists; delete removes from grid (subject to pending rule); reload preserves list.

---

### Step 10 — PWA (installable)

**manifest.json** — create in the same directory as `index.html`:
```json
{
  "name": "Spouse Points",
  "short_name": "SpousePoints",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#faf7f2",
  "theme_color": "#e07a5f",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Meta tags** — add to `<head>`:
```html
<link rel="manifest" href="manifest.json">
<meta name="theme-color" content="#e07a5f">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Spouse Points">
```

**Service worker** — `sw.js`, cache-first for the app shell (production also precaches `manifest.json` and icons, and returns a cached `index.html` for **navigate** requests when offline):
```js
const CACHE = "spouse-points-v2";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)))
);

self.addEventListener("fetch", (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).catch(() => {
        if (e.request.mode === "navigate") {
          return caches.match("./index.html").then(
            (page) => page || new Response("", { status: 503, statusText: "Offline" })
          );
        }
        return new Response("", { status: 503, statusText: "Offline" });
      });
    })
  );
});
```

Register in `index.html`:
```js
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js");
}
```

**Icons** — generate a simple 192×192 and 512×512 PNG. Can use any favicon generator with the coral accent color (`#e07a5f`) and a trophy or tally mark.

**Done when:** Chrome on Android shows "Add to Home Screen" prompt; iOS shows the app name when added via Share → Add to Home Screen; app launches without browser chrome.

---

## Testing Checklist

- [x] Award points → Messages opens with sync link on mobile; SMS body has what was noticed + link, **no quip** *(implemented; confirm on device)*
- [x] Partner taps link → correct scores and pending load → hash clears; local ledger unchanged; local Settings names unchanged; **onboarding toast** when names still default or don’t match packet *(implemented; confirm on device)*
- [ ] **Lifecycle re-entry (Step 11):** with PWA or tab **already open**, return from Messages via incoming `#state=` link → scores/pending update **without** manual refresh; bfcache back-navigation still correct *(see Patch plan under Step 2)*
- [x] Request points → Messages opens with request text and link *(implemented; confirm on device)*
- [x] Partner taps link → pending request surfaces → Award it → **return** Messages opens with updated sync link (celebration leg) *(implemented; confirm on device)*
- [x] Pass a request → no message sent, request disappears, no ledger entry *(implemented; confirm on device)*
- [x] Multiplier doubles/triples point value, resets after award *(implemented; confirm in UI)*
- [x] Settings: name change persists and syncs to toggle labels *(Step 8)*
- [x] Settings: custom point value persists and applies to new awards *(Step 8)*
- [x] Settings: add / edit / reorder / delete categories; persists across reload *(Step 9)*
- [x] New category uses correct points; unknown key on partner device resolves with fallback quips *(Step 9)*
- [x] Single-owner flow: no partner switcher; awards to B, requests from A; link apply swaps A/B when sender/receiver slotting differs *(see `SPEC.md`)*
- [x] No in-app reset to wipe scores/ledger (verify absent in Settings); fresh start only via OS / private window / clear site data*
- [x] Desktop: SMS handoff degrades gracefully (shows URL in toast) *(implemented; confirm on device)*
- [x] PWA: installs to home screen on iOS and Android *(Step 10; confirm on device)*
- [x] Offline: app loads after install with no network *(Step 10; confirm on device)*

---

## Pre-beta quality gate (clarity first)

Run this gate **before** any wider beta share:

- [x] **Forced names:** first-run requires both names before award/request can be submitted.
- [x] **Post-name micro-moment:** immediately after both names are entered, show only:
  - "This isn't a real score."
  - "It's just a way to notice each other more."
  Then move straight to a tappable next action so they experience the loop right away.
- [x] **No visible A/B copy:** UI and SMS contain no "Partner A/B" language (internal slotting remains implementation detail only).
- [x] **Caveman copy sweep:** action labels and helper text are plain enough for low-energy use.
- [x] **Vocabulary consistency:** same conceptual phrasing across buttons, toasts, ledger labels, and SMS drafts.
- [x] **No lecture copy:** onboarding text stays to the two-line micro-moment only; no philosophy paragraph or manifesto framing.
- [x] **Request/award visibility fix:** after sending a request, an award must not appear on the request sender's UI preemptively. Award confirmation should appear only on the receiver's UI first, then on the sender only after the receiver awards and the return sync link is applied.
- [x] **Desktop handoff strategy:** detect non-mobile and switch from `sms:` auto-open to copy-first UX:
  - no auto-open Messages on desktop
  - show: "Copy this and send it to [Name]"
  - provide a large, obvious **Copy Message** button
- [ ] **Exhausted-parent test:** one tired parent gets one prompt ("Use this with your partner"), then completes onboarding + award + request without coaching.
- [ ] **Pass line:** tester never asks "Wait, what am I supposed to do?"

Status (2026-04-14): Product-side clarity fixes (including desktop copy-first handoff) landed in `index.html`; the multi-select toggle is implemented and currently initializes **on** for fresh local state; human exhausted-parent test is still required before wider beta share.

If any box fails, treat it as a blocker and fix copy/flow before expanding the tester pool.

### Spouse test observations (2026-04-14)

- **First question asked:** "Can I click multiple items to award points?"
- **Interpretation:** Tester expectation leans toward batch recognition in one action, not one category per tap.
- **Feasibility (product + implementation):** **Medium-high.** Current data model already has stable category keys and point resolution per key, so a multi-select award mode is additive rather than a rewrite.
- **Main implementation shape (if prioritized):**
  - Add multi-select state for award categories (request flow unchanged).
  - Award as one grouped action that sums selected category points (respect multiplier behavior rules).
  - Ledger/SMS should stay human-readable by listing selected labels, then total points and sync link.
  - Keep existing single-select as default or fallback to preserve low-friction one-tap flow.
- **Risks to validate:** More taps/choices could add cognitive load and make "quick notice" feel heavier; test whether grouped selection improves felt fairness without slowing use.

### Open sync-order question (2026-04-14)

- **Question to validate:** What happens when multiple awards and a request are sent before spouse accepts any link?
- **Desired behavior:** Every newly generated outbound link should capture the sender's current full state at that moment (scores + pending), so the receiver can tap only the most recent message and be fully caught up.
- **Why this matters:** Real threads are bursty; requiring the receiver to open several older links in sequence creates confusion and stale-state risk.
- **Verification target:** Confirm request creation after one or more unsynced awards still serializes current sender state into `#state=`; receiver applying only the latest link lands on the same state as replaying all prior links.
- **If mismatch appears:** Treat as release-blocking sync integrity bug and fix packet generation/apply ordering before wider beta.

### Post–v2 launch field report — totals vs ledger (2026-04-14)

- **Reported experience:** Partner **opened an incoming sync link**; **running point totals updated**; the **ledger / history list did not** show matching new rows for that activity.
- **Spec cross-check first:** `SPEC.md` states the sync packet carries **`scores` + `pending` only**; **`history` is local and is not transmitted**. A link-only apply can therefore move totals **without** appending ledger rows. Do not assume an implementation bug until the scenario is classified.
- **Next tests (pick the branch that matches what actually happened):**
  - **A — Link-only receiver:** If the only action was “open partner’s `#state=` link,” decide whether the gap is **expected by design** vs a **UX / copy** problem (people assume the ledger mirrors the thread). Capture whether `pending` looked correct when totals moved.
  - **B — Local action bug:** If the receiver (or sender) performed an **award / resolve** that should have called the normal `history` write path **on that same device** and the ledger still failed to update while totals changed, treat as a **defect candidate**: file repro with devices, OS/browser, build/commit, screenshots, and decoded packet (`scores`, `pending`, `ts`).

### Post–v2 launch field report — stale scoreboard until manual refresh (2026-04-14)

- **Reported experience:** URLs exchanged in Messages; opening a link does not always force a cold load; **points stay invisible or wrong on screen** until the user manually refreshes.
- **Classification:** Treat as **client lifecycle / navigation** (init-only `#state=` handling), not “bad packet,” when a full refresh fixes the UI. Capture whether `#state=` was still in the address bar when broken.
- **Planned fix:** **Step 11** in the progress table — implementation steps and QA matrix live under **Patch plan — lifecycle re-entry for `#state=`** immediately after Step 2 in this file; product framing in `SPEC.md` *Field note (2026-04-14): stale scoreboard after link from Messages*.

### Pre-beta blocker execution plan (2026-04-14)

#### Blocker A (P0): burst-send sync-order semantics

- **Owner outcome:** Prove or disprove **newest-link-wins** under burst sends before wider beta.
- **Validation matrix (must run on real phones):**
  - A1: send 3 spontaneous awards in a row, open only the last link on receiver.
  - A2: send 2 awards, then 1 request, open only the last link on receiver.
  - A3: send request, then award, then request, open only the last link on receiver.
  - A4: open links out of order (latest first, then older) and confirm final state remains correct.
- **Evidence required:** capture sender/receiver screenshots for each step plus decoded packet checks (`scores`, `pending`, `ts`) from each generated link.
- **Pass criteria:** latest link alone reproduces sender-current state for scores + pending in A1–A3; A4 never regresses final state after newer state already applied.
- **Fail handling (release-blocking):**
  - Freeze wider beta recruiting.
  - Implement deterministic apply guard (ignore stale packet by `ts` once a newer packet has been applied on that device).
  - Re-run full matrix + existing regression checklist before reopening beta.

#### Blocker B: multi-select awards expectation

- **Owner outcome:** test whether grouped recognition improves fairness without hurting speed.
- **Implementation shape (prototype behind toggle):**
  - Settings toggle exists: **"Enable multi-select awards (beta)"**. Current app behavior initializes it **on** for fresh local state; beta decision is whether to keep that default or flip to off.
  - In award mode only, toggle category chips to selected/unselected state; request flow stays single-select.
  - Submit one grouped award: sum selected category points (then multiplier), write one ledger row, compose one SMS line with selected labels + total.
  - Keep one-tap single-select unchanged when toggle is off.
- **Evaluation plan (same couple, same week):**
  - Run 5 sends in single-select mode, then 5 sends in multi-select mode.
  - Measure time-to-send and ask 2 prompts after each mode: "Did this feel fair?" and "Did this feel slower?"
- **Pass criteria for beta-on toggle:** median send time does not materially regress and subjective fairness improves.
- **Fallback:** keep toggle shipped but default off (or remove from beta build) if fairness gain is weak or send friction increases.

### Execution checklist (run log template)

Use this as the pre-beta evidence log. Fill date/owner/device details as you execute.

**Run metadata**
- [ ] Date: __________
- [ ] Owner: __________
- [ ] Sender device/OS: __________
- [ ] Receiver device/OS: __________
- [ ] Build/commit tested: __________

**Blocker A (P0) — burst-send sync-order validation**
- [ ] A1 run completed (3 awards burst; receiver opens latest link only)
- [ ] A1 result recorded (PASS/FAIL): __________
- [ ] A1 evidence attached (sender + receiver screenshots, decoded latest packet `scores/pending/ts`)
- [ ] A2 run completed (2 awards, then 1 request; receiver opens latest link only)
- [ ] A2 result recorded (PASS/FAIL): __________
- [ ] A2 evidence attached (sender + receiver screenshots, decoded latest packet `scores/pending/ts`)
- [ ] A3 run completed (request, then award, then request; receiver opens latest link only)
- [ ] A3 result recorded (PASS/FAIL): __________
- [ ] A3 evidence attached (sender + receiver screenshots, decoded latest packet `scores/pending/ts`)
- [ ] A4 run completed (open links out of order: latest first, then older)
- [ ] A4 result recorded (PASS/FAIL): __________
- [ ] A4 evidence attached (state comparison before/after older link opens)
- [ ] Combined verdict: newest-link-wins confirmed across A1–A4
- [ ] If any FAIL: beta freeze invoked + stale-packet guard (`ts`) ticket created
- [ ] After fix (if needed): A1–A4 rerun completed and passed

**Blocker B — multi-select awards prototype evaluation**
- [x] Settings toggle implemented: "Enable multi-select awards (beta)" (currently initializes ON for fresh local state)
- [ ] Single-select baseline run completed (5 sends)
- [ ] Baseline median send time captured: __________
- [ ] Multi-select trial run completed (5 sends)
- [ ] Multi-select median send time captured: __________
- [ ] Fairness prompt captured after baseline: "Did this feel fair?" -> __________
- [ ] Fairness prompt captured after multi-select: "Did this feel fair?" -> __________
- [ ] Speed prompt captured after baseline: "Did this feel slower?" -> __________
- [ ] Speed prompt captured after multi-select: "Did this feel slower?" -> __________
- [ ] Ledger/SMS readability spot-check passed for grouped awards
- [ ] Decision recorded: `beta_default=on` / `beta_default=off` / `defer`
- [ ] Rationale captured (1-2 sentences): __________

**Pre-beta go/no-go**
- [ ] A1–A4 all PASS (or PASS after documented fix/rerun)
- [ ] Multi-select decision documented with evidence
- [ ] Regression checklist in this doc re-run after any sync/order fix
- [ ] Recommended testing suite **step 8 (Lifecycle / resume)** PASS once Step 11 ships
- [ ] Final decision: `GO wider beta` / `NO-GO`

### Recommended testing suite: hashed `#state=` in Messages

**Why:** Sync bugs and “totals moved but ledger didn’t” reports almost always need the **actual URL** decoded — guessing from UI alone is unreliable. This file has **no Jest/Vitest harness** (single-file vanilla constraint); the suite below is the **supported** way to investigate `#state=` end to end.

**Run the suite in this order:**

| Step | What to do | Pass signal |
|------|----------------|-------------|
| **1. Environment** | Same commit/build on sender + receiver; two profiles, two browsers, or two phones. Clear or isolate `localStorage` when you need a clean baseline (`SPEC.md` *Testing without a product reset*). | No silent mismatch from stale cached shell vs new `index.html`. |
| **2. Baseline sync** | Single award or single request → one link → receiver opens it. | Decoded `scores` / `pending` match receiver UI after apply; location **hash stripped**; `lastAppliedPacketTs` (if inspecting storage) respects packet `ts`. |
| **3. Decode every link** | For each message under test, copy the **full URL** and run the **Decode packet quickly** snippet below *before* arguing about ordering. | Console output matches sender state at send time; burst runs preserve **monotonic `ts`** on newly generated links. |
| **4. Burst / ordering** | Execute **A1–A4** in *Pre-beta blocker execution plan*; keep screenshots + decoded payloads as evidence. | Newest-link-wins for A1–A3; opening an older link after a newer apply does **not** roll back state (stale guard). |
| **5. Couple loop integrity** | Run **Regression checklist (request/award sync integrity)**. | No premature scores on requester; award lands on resolver first; pass stays silent. |
| **6. Malformed packets** | Truncate `#state=`, flip `v`, drop `scores.a`, inject `NaN` — paste into hash navigation on a throwaway tab. | Apply rejects packet; prior good `localStorage` state unchanged (week-12 hardening spot-check; see `ROADMAP-12w.md`). |
| **7. Ledger vs totals** | Classify reports using `SPEC.md` *Field note* + *Post–v2 launch field report* here: link-only vs local-action bug. | Bug tickets include **devices, build, steps, and decoded packet**. |
| **8. Lifecycle / resume** | Step 11 patch plan: backgrounded app or bfcached tab; tap link from Messages or use Back after forward navigation. | `#state=` applies when expected; if hash absent after OS handoff, rehydrated UI still matches `localStorage` scores/pending; no duplicate stale rollback vs `lastAppliedPacketTs`. |

Subsections below (**Decode packet quickly**, **Pre-beta blocker execution plan**, **Regression checklist**) are the **executable** parts of this suite; the execution checklist template is the **audit log**.

### Decode packet quickly (helper)

Use this during A1–A4 evidence capture to verify link payloads in seconds.

1) Copy the full sync URL from Messages.
2) In browser console, run:

```js
const hash = new URL("PASTE_FULL_URL_HERE").hash;
const encoded = hash.startsWith("#state=") ? hash.slice(7) : "";
const packet = JSON.parse(atob(encoded));
console.log({
  v: packet.v,
  scores: packet.scores,
  pendingCount: Array.isArray(packet.pending) ? packet.pending.length : 0,
  ts: packet.ts,
  tsISO: packet.ts ? new Date(packet.ts).toISOString() : null,
});
```

3) Capture screenshot of console output and store with test evidence.
4) For out-of-order tests, compare `ts` values directly: newer packet should have larger `ts`.

### Beta tester interview questions (required)

Ask questions that hurt slightly:
- "When did this feel annoying?"
- "Did you ever not want to send points?"
- "Did anything feel unfair or weirdly real?"
- "Would you keep using this if I didn't ask you to?"

And the big one:
- "Did this make you notice me more, or just the app more?"

If the answer trends toward "just the app more," quietly panic and adjust before widening usage. Treat that as a north-star signal, not a minor preference.

### Regression checklist (request/award sync integrity)

Run after any change to request, award, `#state=` sync, pending resolution, or **Step 11 lifecycle resume** listeners:

- [ ] **Request send creates pending only:** sender sends request; sender UI shows request sent state but **not** awarded state.
- [ ] **Receiver sees pending request:** receiver opens incoming link and sees pending request ready for Award/Pass.
- [ ] **No premature award on sender:** before receiver acts, sender does not show awarded entry, awarded toast, or score increase for that request.
- [ ] **Award appears on receiver first:** receiver taps Award; receiver score/ledger updates immediately on receiver UI.
- [ ] **Sender updates only via return sync:** sender applies return link from receiver award; only then sender UI shows awarded state/score change.
- [ ] **Pass remains silent:** receiver taps Pass; sender gets no award confirmation, no score change, and no false ledger row.
- [ ] **Direct award flow still works:** non-request award still sends/loads correctly and does not regress from this fix.

Any failure is a release blocker for pre-beta expansion.

---

## Staged backlog — mobile category grid (two columns)

**Captured:** 2026-04-14. **Intent:** ship after pre-beta P0 blockers unless this is picked up as a trivial CSS-only win in a polish pass.

### Problem

Award and request flows render category chips in `.category-grid` inside `index.html`. The default layout is **two columns** (`grid-template-columns: 1fr 1fr`). Inside `@media (max-width: 480px)` the same stylesheet forces **one column** (`grid-template-columns: 1fr`).

Typical phone **CSS viewport widths** often sit between ~360px and ~430px, which is **below 480px**, so **most mobile sessions always see a single column** — not because the content measured overflow, but because of the breakpoint.

Product-wise, that wastes horizontal space: two modest columns with the current gaps and button padding often still fit, so the grid can feel unnecessarily tall and scroll-heavy compared to desktop.

### Current code anchor

- **Default grid:** `.category-grid { display: grid; grid-template-columns: 1fr 1fr; … }`
- **Mobile override:** `@media (max-width: 480px) { … .category-grid { grid-template-columns: 1fr; } }`

### Staged recommendation

**Stage 1 — Validate and choose a minimal CSS change (preferred first step)**

- On real devices (or responsive mode at iPhone SE / small Android width), **temporarily remove** the `.category-grid` single-column override *or* **lower** the breakpoint so only very narrow viewports collapse (e.g. try `max-width: 360px` or `340px` instead of `480px`).
- **Acceptance:** no horizontal scroll on the award card; category labels remain readable; tap targets still feel comfortable with the longest plausible custom category name from Settings.
- **If** long labels wrap awkwardly at two columns, prefer tightening typography or grid gap slightly *before* giving up on two columns.

**Stage 2 — Layout that tracks “enough width” instead of a single magic number**

- If a fixed breakpoint stays flaky across devices and user-defined label lengths, switch to a **content-driven grid**, for example `repeat(auto-fit, minmax(<min-track>, 1fr))` so the browser chooses one vs two columns from available width. Tune `<min-track>` against the real minimum comfortable chip width (include emoji + padding).
- Use `minmax(0, 1fr)` (or equivalent overflow discipline) so long words in custom categories do not blow out the grid.

**Stage 3 — QA pass**

- Re-check award mode and request mode (same grid), multi-select on/off, and settings with **many** categories and **long** labels on iOS Safari and Android Chrome.

**Non-goals for this item:** changing category data model, SMS copy, or sync behavior — layout only.

---

## Out of Scope for V2

- Decay (v3)
- Backend of any kind
- Accounts or authentication
- Kids / multi-party mode
- Any analytics
- In-app global reset / wipe ledger (by design; see `SPEC.md`)

---

*© 2026 Eric Allatta*
