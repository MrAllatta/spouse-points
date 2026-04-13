# Spouse Points — Build Spec

A **mirror** for two people: domestic labor and emotional effort made visible, named, and credited. The **scoreboard** metaphor is the easy vocabulary (and early UI uses numeric totals as **shipping scaffolding**), but the thesis is *did you notice?* — not *who is ahead?* Not a task manager. Not a chore chart.

> "A little scoreboard helps us laugh while we learn to notice each other."

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

- Recipient is the partner who did the thing
- Category selected from a fixed grid (or freeform)
- Points awarded: fixed value per category, with sensible defaults — not randomized
- A quip surfaces on award — dry, specific, not generic
- **Completes by opening Messages** with a pre-composed text and sync link — there are no private awards. Awarding points without telling your partner is keeping a diary. The mechanic doesn't allow it.

### 2. Request Points
A partner flags that they did something and would like acknowledgment.

- Requester selects themselves as the subject
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

Both the default values and the multiplier options are adjustable in Settings.

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

**On tap:** app reads the fragment, merges into localStorage (URL scores and pending win, local history is preserved), clears the hash. localStorage takes over from that point.

**The text thread is the commit log.** Each link encodes the state at that moment. Scroll back through the thread and you can see the ledger's history. This is a little beautiful and also ridiculous, which is right.

**URL length:** ~600 characters with a typical pending queue. iMessage renders it as a preview card, not a wall of text.

**V2.5: PWA (installed software)**

Add a service worker and manifest to the existing project. Partners tap "Add to Home Screen" once. After that it launches from an icon, runs without browser chrome, loads instantly, works offline. The URL-as-sync mechanism is identical. "Installed software with text as sync" is a PWA — roughly two hours of additional work on top of what exists.

**No notifications needed.** The text message is the notification. The quip in the pre-composed text is the push notification body. No server required.

### Settings Page
A shared settings screen accessible to both partners. Covers:

- **Partner names** — what appears on scorecards and in the ledger
- **Category point values** — adjust defaults per category; changes apply going forward, not retroactively
- **Decay half-lives** — per category, if decay is enabled
- **Decay on/off toggle** — the feature should be opt-in; not every couple will want it
- **No global reset in settings** — by design (see **Design choice: In-app reset**); couples who need a blank slate use OS-level app data removal / reinstall

Settings should be mundane-looking on purpose. The emotional texture of the app lives in the award/request flow, not in configuration.

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
- Neutral (current): pass button, request disappears
- Named: the pass button says something specific ("Not this one" / "Let it go")
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
- Award flow with categories and quips
- Request flow with pending queue and resolution
- Ledger with entry type tagging
- Persistent state via localStorage
- The emotional tone of the quip writing

What it does not yet capture:
- Fixed per-category point values (currently randomized 1–3 as a placeholder)
- Award multiplier (1× / 2× / 3×)
- Decay
- Settings page
- URL-as-state sync packet (hash fragment encoding/decoding)
- Messages handoff on award and request completion
- PWA manifest + service worker (installable)

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
