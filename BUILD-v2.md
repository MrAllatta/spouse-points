# Spouse Points — V2 Build Plan

**Goal:** URL-as-state sync via text message. Installable PWA. No backend.  
**Target:** Shippable by end of weekend, postable Monday.  
**Constraint:** Single HTML file preferred. No build tooling, no npm, no framework.

---

## What V1 Already Has

- Award and request flows with categories and quips
- Pending queue with Award/Pass resolution
- Ledger with entry tagging
- localStorage persistence
- Fixed categories including Dishes (2pts) and Gave Birth (1,000,000pts)
- Copyright footer

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
  state.scores = packet.scores;
  state.pending = packet.pending || [];
  if (packet.names) {
    document.getElementById("name-a").value = packet.names.a || "PARTNER A";
    document.getElementById("name-b").value = packet.names.b || "PARTNER B";
  }
  document.getElementById("score-a").textContent = state.scores.a;
  document.getElementById("score-b").textContent = state.scores.b;
  syncNames();
  renderPending();
  saveState();
}
```

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

### Step 3 — Messages handoff on award

Replace the `showToast()` call at the end of `awardPoints()` with a function that:
1. Shows the toast as before
2. After a short delay (or immediately), opens Messages with the sync link

```js
function openMessages(precomposedText) {
  const encoded = encodeURIComponent(precomposedText);
  window.location.href = `sms:?body=${encoded}`;
}
```

Award completion:
```js
const url = buildShareURL();
const recipientName = ...; // already have this
openMessages(`+${points} to ${recipientName} 🎉 ${url}`);
```

The quip can go in the message body too if it fits naturally.

**Note:** `sms:` scheme works on iOS and Android. On desktop it will fail gracefully — show the URL in the toast instead so it can be copied.

```js
const isMobile = /iPhone|Android/i.test(navigator.userAgent);
if (isMobile) {
  openMessages(`+${points} to ${recipientName} 🎉 ${url}`);
} else {
  // show share URL in toast for desktop testing
  document.getElementById("toast-quip").textContent = url;
}
```

**Done when:** awarding points on mobile opens Messages with a pre-filled text containing the sync link.

---

### Step 4 — Messages handoff on request

Same pattern. At the end of `requestPoints()`:

```js
const url = buildShareURL();
openMessages(`I did the thing 👀 ${url}`);
```

Pre-compose text can include the category label:
```js
openMessages(`Credit where it's due: ${label} 👀 ${url}`);
```

**Done when:** tapping "Request Points" on mobile opens Messages with the request text and link.

---

### Step 5 — Pass is silent dismiss

In `resolveRequest()`, remove the `passed` ledger entry entirely. Pass just splices the request from `state.pending`, calls `renderPending()` and `saveState()`. No message, no history entry, no toast.

The "Pass" button label can soften to "Not this one" to match the emotional register.

**Done when:** passing a request clears it from pending with no outbound message and no ledger entry.

---

### Step 6 — Award multiplier (1× / 2× / 3×)

Add a multiplier toggle to the award section UI — three small buttons, default 1×:

```html
<div class="multiplier-toggle" id="multiplier-row">
  <button class="mult-btn active" data-mult="1" onclick="setMultiplier(1)">1×</button>
  <button class="mult-btn" data-mult="2" onclick="setMultiplier(2)">2×</button>
  <button class="mult-btn" data-mult="3" onclick="setMultiplier(3)">3×</button>
</div>
```

Add `state.multiplier = 1`. In `awardPoints()`: `const points = pointValues[key] * state.multiplier`.  
Reset multiplier to 1 after each award in `clearForm()`.

Hide the multiplier row when in Request mode (multiplier doesn't apply to requests).

**Done when:** selecting 2× doubles the awarded points; multiplier resets after each award.

---

### Step 7 — Settings panel

A slide-up panel (not a separate page) triggered by a gear icon in the header.

Contents:
- Partner name fields (move from scorecards — or keep both in sync)
- Point value overrides: number input per category, pre-filled with defaults
- Reset button: clears scores and history after a double-tap confirmation

```html
<div class="settings-panel" id="settings" style="display:none">
  <h2>Settings</h2>
  <!-- name fields -->
  <!-- point value inputs -->
  <!-- reset -->
  <button onclick="closeSettings()">Done</button>
</div>
```

Store custom point values in `state.customPoints = {}`. In `awardPoints()`, lookup order: `state.customPoints[key] ?? pointValues[key] ?? 2`.

Custom point values go into `saveState()` / `loadState()`. They do **not** go into the sync packet — each partner can have their own opinion about defaults, and the sync packet is about state not configuration.

**Done when:** changing "Made coffee" to 3 in settings persists across reloads and applies to new awards.

---

### Step 8 — PWA (installable)

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

- [ ] Award points → Messages opens with sync link on mobile
- [ ] Partner taps link → correct scores and names load → hash clears from URL
- [ ] Request points → Messages opens with request text and link
- [ ] Partner taps link → pending request surfaces → Award it → return text sends
- [ ] Pass a request → no message sent, request disappears, no ledger entry
- [ ] Multiplier doubles/triples point value, resets after award
- [ ] Settings: name change persists and syncs to toggle labels
- [ ] Settings: custom point value persists and applies to new awards
- [ ] Reset: clears scores and history, requires double confirmation
- [ ] Desktop: SMS handoff degrades gracefully (shows URL in toast)
- [ ] PWA: installs to home screen on iOS and Android
- [ ] Offline: app loads after install with no network

---

## Out of Scope for V2

- Decay (v3)
- Backend of any kind
- Accounts or authentication
- Kids / multi-party mode
- Any analytics

---

*© 2026 Eric Allatta*
