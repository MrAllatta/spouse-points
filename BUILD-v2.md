# Spouse Points — V2 Build Plan

**Goal:** URL-as-state sync via text message. Installable PWA. No backend.  
**Target:** Shippable by end of weekend, postable Monday.  
**Constraint:** Single HTML file preferred. No build tooling, no npm, no framework.

**Product stance (do not skip when implementing):** Numeric scores and `pointValues` exist for **sync and clarity**, not to crown a winner. Prefer **ledger + message body** as the emotional surface; avoid adding extra number chrome without cause. **Absurd or non-comparable values** (e.g. birth) are intentional — they break fungible “we’re seriously counting” energy. Full debate and open questions: `SPEC.md` (*Debate: Scoreboard numbers…*, *Seasonal labor…*, Open Question **7**).

**Single-owner install (each PWA):** Partner **A** = the human whose phone it is; Partner **B** = their spouse. **Awards always credit B**; **requests always come from A**. There is **no** main-screen control to impersonate the other partner—you send to them via Messages, they maintain the same two totals on their copy. Settings on each device label A as “you” and B as “your spouse.” When a `#state=` packet arrives, `index.html` may **swap incoming `a`/`b`** for scores and flip `pending[].requester` if the sender’s `names` order is opposite the receiver’s (packet names stay for SMS legibility + orientation; **local name fields are not overwritten** from the link). Full write-up: `SPEC.md` (*Core Mechanics*, *Persistence & Device Model*).

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
  if (!packet || packet.v !== 1) return;
  // Production also swaps a/b for scores + pending when packet.names
  // disagree with local “A = me, B = spouse” — see index.html / SPEC.md.
  state.scores = packet.scores;
  state.pending = packet.pending || [];
  document.getElementById("score-a").textContent = state.scores.a;
  document.getElementById("score-b").textContent = state.scores.b;
  syncNames();
  renderPending();
  saveState();
}
```

`applyPacket` updates **scores and pending** from the URL; **local ledger (`state.history`) is unchanged** so the device keeps its private archive (`SPEC.md` merge behavior). **Names in Settings stay local** (A = you, B = spouse on this install); the packet’s `names` are used to detect whether incoming `a`/`b` need a **swap** relative to this phone. Production `index.html` implements that swap + pending `requester` flip; the snippet below is the minimal merge — extend per `SPEC.md` *Persistence & Device Model*.

Add to `init()` — check for hash on load, apply and clear:
```js
function checkHashState() {
  if (!location.hash.startsWith("#state=")) return;
  try {
    const packet = JSON.parse(atob(location.hash.slice(7)));
    applyPacket(packet);
  } catch (e) {}
  history.replaceState(null, "", location.pathname);
}
```

**Done when:** generating a URL, opening it in a second browser tab, and seeing the correct scores and pending state load.

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

**Service worker** — `sw.js`, cache-first for the app shell:
```js
const CACHE = "spouse-points-v2";
const SHELL = ["./", "./index.html"];

self.addEventListener("install", e =>
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)))
);

self.addEventListener("fetch", e =>
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)))
);
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
- [x] Partner taps link → correct scores and names load → hash clears from URL; local ledger unchanged *(implemented; confirm on device)*
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

## Out of Scope for V2

- Decay (v3)
- Backend of any kind
- Accounts or authentication
- Kids / multi-party mode
- Any analytics
- In-app global reset / wipe ledger (by design; see `SPEC.md`)

---

*© 2026 Eric Allatta*
