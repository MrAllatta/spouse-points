# Spouse Points — Build Spec

A **mirror** for two people: domestic labor and emotional effort made visible, named, and credited. The **scoreboard** metaphor is the easy vocabulary (and early UI uses numeric totals as **shipping scaffolding**), but the thesis is *did you notice?* — not *who is ahead?* Not a task manager. Not a chore chart.

> "A little scoreboard helps us laugh while we learn to notice each other."

## Courtroom Test (North Star Constraint)

The app must never feel more "real" than the relationship.

If at any point:
- points feel authoritative
- logs feel like evidence
- the system feels like truth

then we have built a courtroom, not a joke.

This test overrides feature cleverness. If a change increases legibility for conflict, adjudication, or "proving who is right" more than it increases warmth, humor, and noticing, reject or redesign it.

---

## What This Is (and Isn't)

Every app in this space — Chore Wars, OurHome, Sweepy — is fundamentally task management with points bolted on. They answer "who did what."

Spouse Points answers something softer: *did you notice?*

The categories that matter most here aren't chores. "Didn't sigh." "Held tongue." "Actually listened." Nobody else is tracking those. That's the product differentiation, and it should stay the north star through every design decision.

---

## On Labor, Gender, and Scope

The categories in this app are, if you look at them honestly, coded as women's work. Dishes. Cooking. Cleaning. Kid duty. This is not an accident and it's not a blind spot — it's the origin story. The app emerged from a specific household dynamic, and the humor lands because it names something a lot of couples recognize in themselves: an unspoken imbalance in who does what, and who notices.

We don't claim to go deeper than that. This is not a labor equity framework. It's not Fair Play. It's a mirror with good jokes; "scoreboard" is the accessible hook, not the moral center (see **Scoreboard numbers vs. what “points” really are** below).

**On gender:** the app is agnostic. The imbalance it reflects is traditional, but who holds which side of it varies. If the joke landed for you, you recognized your household in it. That's the whole thing. We make no assumptions about which partner is which.

**The open question: does earning income earn points?**

Right now the app tracks domestic and emotional labor exclusively. But household contribution includes things the categories don't touch: being the primary earner, managing finances, subsidizing your partner's career by absorbing more home duties so they can pursue theirs. These are real forms of labor. They're invisible in a different way.

The app doesn't track them. That's a choice worth naming. A few reasons:

- Domestic and emotional labor is the category that *already goes unnoticed* most often. Income is at least legible — there's a number on a pay stub. The dishes at 11pm have no receipt.
- Mixing financial contribution into the same scoreboard risks turning "I earn more" into a trump card that closes the conversation instead of opening it.
- The app is a mirror, not an arbitration system. Adding income could shift it toward justification.

That said: it's a genuinely open question. Some couples would want it. A settings toggle — "track financial contributions" — isn't out of bounds. It stays out of scope for now, not because the question is wrong, but because the app works better with a narrow lane.

---

## Seasonal labor, default spaces, and cross-cultural versions

### Seasonal spouse points

Invisible labor often **spikes on a calendar**: holidays, end-of-school, birthdays stacked in one month. The same “did you notice?” lens applies to work that is real, exhausting, and easy for the other partner to skip seeing.

Examples couples already shorthand without needing a formal taxonomy:

- Got the kids their presents (remembering who wants what, ordering, budget)
- Wrapped the presents
- Got your partner’s mother a present (extended-family emotional logistics)
- Sent the Christmas cards (or whatever your household uses for the annual “we exist and we care” outreach)

These belong in the product imagination as **optional seasonal weight** — e.g. a time-limited “season pack,” toggled categories, or custom lines — not as a permanent mandatory grid that bakes one holiday into the core SKU forever. The implementation detail matters less than the principle: **when the ordinary grid under-counts a real spike, the mirror should be allowed to widen.**

### Politics of defaulting into a point space

Any default category set carries a worldview:

- **Calendar / observance:** Examples like Christmas cards default the cultural furniture toward **Christian-adjacent** rhythms even when the app itself is secular.
- **Gender:** The core grid already reads as **female-coded** domestic and emotional labor (named honestly earlier in this spec).

**Stance:** Ship **stereotypical defaults that are obviously changeable** — editable names, custom categories, and (once settings exist) local point overrides. Defaults are a **starting caricature** the couple rewrites together, not a silent claim about whose labor is universal. Surface in UI or onboarding that the list is **theirs to edit**, so the politics of the default land as **visible and reversible** rather than smuggled in as neutral truth.

### Other cultures: partners, not synthetic “packs”

The mechanic travels; the **quips and categories do not** auto-travel by swapping string tables or prompting a model. A version tuned for another culture needs people who **live inside the joke** in that context — co-authors, reviewers, or couples you actually know — so tone stays affectionate and specific instead of generic “localized” slop that reads as opportunistic or performed.

**Rule of thumb:** No culture-specific pack ships on AI- or checklist-authored stereotypes alone. Authentic partnership in the writing is part of the definition of done, the same way the English quips were tuned for one marriage before anything generalized.

---

## Core Mechanics

### 1. Award Points
One partner notices something the other did and awards points for it. Spontaneous noticing is the primary gesture the app is designed to encourage.

- **Recipient on this device:** always **Partner B** — your spouse. **Partner A** is *you* on the phone where the app is installed. There is **no in-app “which partner am I?” toggle**; the install is owned by one person, you both keep a scoreboard, and every outbound award is “I noticed you.” Names for A and B are set in Settings on each phone (each partner’s install should name themselves as A and the other as B).
- Category selected from the **grid on this device** — seeded from the same default caricature list for everyone, then **editable in Settings** (add / rename / reorder / delete rows; see `BUILD-v2.md` Step 9, shipped in `index.html`). **Per-category point values** are editable in Settings. Freeform detail remains available via the custom line + category choice.
- Points awarded: fixed value per category (with optional local overrides), sensible defaults — not randomized
- A quip surfaces on award — dry, specific, not generic
- **Completes by opening Messages** with a pre-composed text and sync link — there are no private awards. Awarding points without telling your partner is keeping a diary. The mechanic doesn't allow it. The draft text leads with points, recipient, and **what was noticed** (category and optional detail), then the sync link — not the quip.

### 2. Request Points
A partner flags that they did something and would like acknowledgment.

- **Requester on this device:** always **Partner A** — you on this phone. The flow is still “text your spouse”; they open the link and see the pending line. No choosing the other person as the requester on your own install.
- Category + optional note
- **Completes by opening Messages** with a pre-composed text and sync link — the request IS the message. A request that doesn't reach your partner didn't happen.

Partner receives the link, taps it, sees the pending request surfaced on open.

**Award it:** points scored, entry in ledger tagged `requested`, celebration text auto-sends back to requester with updated sync link. Requester taps it, score updates. Two taps total after the initial request.

**Pass:** silence. Partner dismisses the request locally — no return message, no ledger entry, no taps required from the requester. Not responding to a text IS passing. The app doesn't need to formalize what silence already communicates.

The requester reads the silence. That's appropriate.

**On self-award:** trying to award yourself requires texting yourself. The mechanic makes this immediately absurd and self-defeating. No explicit rule needed — the flow enforces it.

### 3. The Ledger
Running history of all activity. Two entry types in the URL model:
- Spontaneous award (no tag)
- Requested + awarded (`requested`)

Passed requests generate no ledger entry in the URL model — pass is silence, not a recorded event. The shared-device v1 retains a `passed` entry since resolution happens in-person, but it should be considered a prototype artifact rather than a permanent feature.

The ratio of spontaneous to requested awards over time is the real signal.

**Ledger vs. quips:** Quips are for the immediate award moment (toast, energy). The ledger row should read as *what was noticed* first — recipient, category (and optional detail), points, and tags — with the quip de-emphasized on a second line when present. The pre-filled outbound message follows the same priority so the text thread stays legible as a record, not a joke log.

---

## Design choice: In-app reset (scores / ledger)

**Tension:** A one-tap reset is convenient for **development and QA** (clean localStorage, repeat flows). For the **product experience**, a reset button says “none of this counted” — which fights the premise that the app is a small **archive of noticing**, not a sandbox you rewind.

**Metaphor:** You cannot un-have a baby, un-do a hard week, or un-notice a gesture that landed. Irreversibility is part of the emotional honesty of the mirror. If the scoreboard stayed purely competitive, a reset would read like “new season.” Here it would read like **erasing shared history**, which is the wrong affordance for a couple’s ledger.

**How to start over anyway (by design):** Deleting the app / clearing site data / reinstalling is a **deliberate, outside-the-flow** nuclear option — the couple is not offered an everyday “undo us” in the UI. That keeps “we’re starting fresh” a **real decision** (it costs friction), not a mis-tap.

**Testing without a product reset:** Developers clear `localStorage`, use a private window, or maintain a throwaway install — no shipped control required.

**Working stance:** **Do not ship** a user-facing **reset scores** or **wipe ledger** in core settings for v1/v2. Revisit only if a future mode is explicitly “practice / demo” and visually separated from the real ledger (not currently planned).

---

## Planned Features (Not Yet Built)

### Point Decay
Points expire over time. Effective score = `points × decay(days_since_award)`.

Rationale: you can't coast on the dishes you did in February. Domestic goodwill has a half-life, and the app should reflect that.

Implementation: calculate at read time (no scheduled jobs needed). Store `awarded_at` timestamp on every entry. Half-life is configurable per category.

Example half-lives (rough starting values):
| Category | Half-life |
|---|---|
| Made coffee | 3 days |
| Cleaned | 7 days |
| Didn't sigh | 14 days |
| Actually listened | 30 days |
| Kid duty solo | 14 days |

Tuning these will require actual use. The first values will be wrong.

### Point Values
Each category has a fixed default point value. These are not randomized — the value of an act should feel consistent and legible, not arbitrary.

Default values (illustrative):
| Category | Default Points |
|---|---|
| Made coffee | 1 |
| Did the dishes | 2 |
| Cooked | 3 |
| Cleaned | 3 |
| Groceries | 3 |
| Kid duty | 4 |
| Didn't sigh | 2 |
| Held tongue | 3 |
| Actually listened | 4 |
| Put phone down | 2 |
| Made bed | 1 |
| Gave birth | 1,000,000 |

An optional multiplier at time of award handles the "I did them without being asked for the third week running — that felt like more" case. Simple: 1× / 2× / 3×. Not a slider.

Both the default values and the multiplier options are adjustable in Settings. The **category list itself** (rows in the grid) is editable in the same panel (`BUILD-v2.md` Step 9 — shipped).

### Persistence & Device Model

**V1: Shared device**

One phone, passed back and forth. State lives in localStorage. Both partners use the same browser session. No sync required because there is only one copy of the state. The shared device moment is itself a small act of togetherness — appropriate for what the app is.

**V2: Text message thread as sync**

No backend. No database. The URL is the data.

Every action that changes state — award or request — completes by opening the native Messages app with a pre-composed text to the partner. The text contains a sync link:

```
"You get points for this 🍽️ [link]"
"I did the dishes 👀 [link]"
```

The link encodes the sync packet as a hash fragment:

```
https://mrallatta.github.io/spouse-points/#state=eyJzY29yZXMi...
```

The `#` (fragment) is never sent to the server. GitHub Pages serves the HTML; it never sees the state. The state is base64-encoded JSON, decoded client-side on tap.

**What's in the sync packet** (scores and pending only — not full history):

```json
{
  "v": 1,
  "scores": { "a": 15, "b": 23 },
  "names": { "a": "Eric", "b": "Jill" },
  "pending": [ { ... } ],
  "ts": 1712789234
}
```

History stays on-device and is never transmitted. It's a private local archive.

**What stays out of the sync packet (on purpose):** Per-device **settings** — custom **point overrides**, the **editable category catalog** (emoji / label / order / user-added rows), and any future decay toggles. Same rationale as overrides: keeps URLs small, avoids packet version churn, and allows each partner to keep a personal grid if they want. **Cross-partner legibility** still works because pending items carry a human-readable **`label`** (and a stable `category` key for scoring on the resolver’s device); if the resolver has never seen that key, scoring falls back to defaults and quips fall back to the generic **custom** pool until they add a matching row locally.

**On tap:** app reads the fragment, merges into localStorage (URL scores and pending win, local history is preserved), clears the hash. localStorage takes over from that point.

**Onboarding toast after a link:** Right after a successful `#state=` apply, the client may show a **non-blocking info toast** (same chrome as the award toast, distinct styling) when local names still look like **placeholders** (`PARTNER A` / `PARTNER B`, empty, etc.) — telling the recipient to open **Settings** and set **You (A)** and **Your spouse (B)** so slotting and future swaps stay trustworthy. A second case: packet `names` are present but **neither** sender name matches **either** local field (typo / wrong person) so orientation is ambiguous — toast nudges them to align spelling with the thread. No extra persistence flag is required; the toast repeats on each link open until names look real and consistent, which is preferable to silently wrong totals.

**Slotting across two installs:** On each phone, **A = this device’s user** and **B = their spouse** (names in Settings). The sync packet still carries `scores.a` / `scores.b` and `names` as the **sender** encoded them. On apply, if the sender’s `names.a` matches this device’s Partner B (and conversely), the client **swaps** incoming `a`/`b` for scores and flips `requester` on pending rows so totals and the queue stay aligned with *local* A=me / B=spouse. **Display names in Settings are not overwritten** from the link so your install keeps “you” on A. Packet `names` remain in the payload for SMS legibility and for this orientation check.

**The text thread is the commit log.** Each link encodes the state at that moment. Scroll back through the thread and you can see the ledger's history. This is a little beautiful and also ridiculous, which is right.

**Burst-send ordering policy (pre-beta blocker):** in real usage, partners will send multiple messages before the other person opens any link. Product expectation is **newest-link-wins**: opening only the most recent link should land the receiver on sender-current `scores` + `pending` without requiring replay of older links. Pre-beta must validate this on-device for award-only bursts and mixed award/request bursts. If out-of-order opens can regress state, the client should treat packet `ts` as a stale-guard and ignore older packets after a newer one has been applied.

**URL length:** ~600 characters with a typical pending queue. iMessage renders it as a preview card, not a wall of text.

**V2.5: PWA (installed software)**

**Shipped in this repo:** `manifest.json`, `sw.js`, icons, and head meta in `index.html` (`BUILD-v2.md` Step 10). Partners use **Add to Home Screen** once; the app launches standalone and the URL-as-sync mechanism is unchanged. The service worker precaches the shell (including icons and manifest) and serves a cached `index.html` for offline navigation where supported.

**No notifications needed.** The text message is the notification. The quip in the pre-composed text is the push notification body. No server required.

### Settings Page
Settings on **each** install (not a literal shared screen): both people configure their own phone.

**Shipped in the current `index.html` mock:** slide-up panel (gear control) with **Partner A = you (this phone)** and **Partner B = your spouse** (stored with local state; **names are included in the URL packet** for legibility and orientation, but **opening a link does not replace** your local name fields), **per-category point overrides** (`customPoints` in localStorage; **not** in the `#state=` packet), **category CRUD** in the same panel, and **no** global reset / wipe ledger.

**Still planned (not shipped):**
- **Decay half-lives** — per category, if decay is enabled
- **Decay on/off toggle** — the feature should be opt-in; not every couple will want it

Settings should be mundane-looking on purpose. The emotional texture of the app lives in the award/request flow, not in configuration.

**Build order (see `BUILD-v2.md`):** settings shell and point overrides first, then category CRUD in that same panel, then PWA install — that sequence is **complete** in the current tree (Steps 8–10 shipped 2026-04-13).

### Stack
| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Vanilla JS | Doesn't need more |
| Persistence | localStorage + URL hash fragment | No backend required |
| Sync | Native Messages (SMS/iMessage) | Text IS the notification |
| Install | PWA + service worker | Home screen icon, offline support |
| Hosting | GitHub Pages | Already there |
| Decay calc | Read-time, client-side | No cron jobs needed |
| Backend | None | By design |

---

## Debate: Scoreboard numbers vs. what “points” really are

The product has **drifted toward the scoreboard analogy** — that is **low-hanging fruit**: totals are easy to render, easy to sync in a URL packet, and easy to reason about in code. **Adding more number surface is easy**, which is exactly why it deserves suspicion.

### One position: numbers are a pragmatic early compromise, not the thesis

**Spouse points**, in the truer reading, are **recognitions** and **how long they last** (decay, half-life, emotional residue) — not a standing comparison of worth. A **non-numeric tally** (badges, ribbons, last-five moments, “weight” without pairwise totals) would be closer to sublime UI: you see *gestures* and *recency*, not two integers in a race. **Resisting numbers alongside numbers** (big total + category points + ledger math all shouting “who won”) is healthy.

Still: **v1 and v2 may need to stay numeric** so the loop ships — sync, ledger, and Messages copy stay legible without inventing a whole symbolic economy first. Numbers-first early versions can be **explicitly temporary scaffolding** if the copy and visuals keep nudging toward *noticed*, not *ahead*.

### The other position: not even v1 should show competitive totals

**Who has more is not the point.** If the north star is *did you notice?*, then a running head-to-head total risks becoming the emotional center of gravity no matter what the quips say — especially under stress. On this view, shipping numeric totals at all (even “small” numbers) trains the wrong muscle.

### Absurdity as a pressure valve

**1,000,000 for birth** works because the number is **obviously a joke**, not a fungible score — it breaks the “we’re seriously counting” frame. That suggests a design pattern: when numbers stay, **let some of them be absurd or non-comparable** so the UI can signal “this category is not in the same game as coffee.” Early versions might lean on **scale discontinuity and humor** until a richer non-numeric or decay-forward presentation is worth the build.

**Working stance for implementation:** ship numeric totals while **refusing to let them become the thesis** — hierarchy and copy favor **ledger lines + Messages** over headline “who won”; use **absurd or non-comparable values** where they signal “not the same game as coffee.” **Unresolved** long-term: remove or hide running totals, recency / recognition-first UI, or totals as vestigial. Revisit after the shareable text loop has real mileage (see Open Design Question **7**).

---

## Open Design Questions

**1. Are requested points worth the same as spontaneous ones?**

Two valid positions:
- *Same value* — asking for acknowledgment takes courage; the effort was real regardless
- *Less value* — spontaneous noticing is the whole point; requesting is a fallback, not a win

Current implementation: same value. Worth revisiting after real use.

---

**2. Does the requester see when their request is passed?**

~~Resolved.~~ In the URL model, pass is silence — no message, no ledger entry. The question of how to surface or label a pass dissolves because a pass is never formally recorded. The requester either gets a celebration text or they don't. Silence is the answer.

---

**3. Can you award points to yourself?**

~~Resolved.~~ The text-as-sync mechanic handles this without a rule. Awarding yourself requires texting yourself. That's immediately absurd. Use Request instead — which also requires texting your partner, which is the point.

---

**4. What is the right decay curve?**

Linear decay is simple. Exponential decay feels more true to how goodwill actually works (fast fade at first, slower after). Half-life model sits between them.

The half-life values in the table above are guesses. Real calibration requires living with the app.

---

**5. What triggers the "passed" feeling?**

Passing a request is a small act with real emotional weight. Does the app acknowledge that weight, or treat it as a neutral UI action?

Options:
- Neutral: pass button, request disappears
- Named (**current in `index.html`**): the pass button says **“Not this one”**; request disappears
- Consequential: passed requests increment a private counter that only the requester sees, surfaced occasionally

---

**6. Should the ledger be permanent or rolling?**

A permanent ledger is an archive of the relationship. A rolling ledger (last 30 days, for example) reflects only the current pattern. Both have merit. The archive is meaningful; the rolling window is actionable.

---

**7. Should running numeric totals stay central — or move aside for recognition-first UI?**

Tied to the debate in **Scoreboard numbers vs. what “points” really are** (above): competitive totals vs. ledger-as-story vs. non-numeric / decay-forward presentations; whether absurd values (e.g. birth) are enough of a long-term escape hatch.

---

## What the Current Mock Captures

The `index.html` prototype is a functional proof of concept for:
- **Single-owner device model:** Partner A is always the person holding this install; Partner B is always their spouse. Awards always credit B; requests always come from A. No partner switcher on the main screen.
- Award flow with categories and quips (grid is default-seeded and **user-editable** in Settings)
- Request flow with pending queue and resolution
- Ledger with entry type tagging (primary line = what was noticed; quip on a second line when present)
- Persistent state via localStorage
- Default per-category point values (`pointValues` map; not randomized), plus **local overrides** in Settings (`customPoints`; not synced in URL)
- Award **multiplier** (1× / 2× / 3×) on spontaneous awards only; resets after each award
- **Settings** slide-up (header gear): you/spouse names, **category CRUD** (reorder / edit / add / delete with pending guard), per-category point inputs, backdrop / Done / Escape to close; names are **in** the `#state=` packet for SMS + orientation; **local** name fields stay yours; overrides stay on-device
- **Multi-select awards toggle (beta):** optional Settings switch for selecting multiple categories in one award action; grouped awards sum selected category points, then apply multiplier, and send one ledger/SMS line
- URL-as-state sync packet (`#state=` hash, base64 JSON) with load-time apply, **A/B swap when the sender’s “who is A” differs from this phone**, **onboarding toast** after link open when names are still placeholders or don’t match the packet, and hash strip
- Messages (`sms:`) handoff after spontaneous award, after request, and after awarding a pending request (with desktop URL-in-toast fallback); pre-filled SMS follows *Core Mechanics* (points, recipient, what was noticed, link — quip stays in-app)
- Pass dismiss with **no** ledger row (**“Not this one”**), matching the URL model
- The emotional tone of the quip writing

What it does not yet capture:
- Decay (read-time half-life model is spec’d only)
- Broader **device QA** (more phones, offline edge cases, bad `#state=` payloads — see `ROADMAP-12w.md` week 12 / `BUILD-v2.md` testing checklist)

The mock is the right fidelity for now. It's enough to show someone and have a real conversation about whether it works.

---

## Prior Art

- **Fair Play** (Eve Rodsky, 2019) — Closest conceptual overlap. Book + card game system about making invisible domestic labor visible and equitably distributed. Became a Netflix documentary. Solves the same emotional problem with a more structured, therapeutic framework. Spouse Points is lighter, weirder, and funnier.
- **Chore Wars** — Gamified chores as RPG quests. Task-completion focused. Dated UX.
- **OurHome** — Family chore management with kid reward system. Not couples-specific.
- **Habitica** — Full habit gamification, RPG aesthetic, individual-focused.

None of them track "didn't sigh." That gap is real.

---

*© 2026 Eric Allatta*
