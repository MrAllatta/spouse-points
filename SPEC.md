# Spouse Points — Build Spec

A shared scoreboard for couples that makes domestic labor and emotional effort visible, named, and credited. Not a task manager. Not a chore chart. A mirror.

> "A little scoreboard helps us laugh while we learn to notice each other."

---

## What This Is (and Isn't)

Every app in this space — Chore Wars, OurHome, Sweepy — is fundamentally task management with points bolted on. They answer "who did what."

Spouse Points answers something softer: *did you notice?*

The categories that matter most here aren't chores. "Didn't sigh." "Held tongue." "Actually listened." Nobody else is tracking those. That's the product differentiation, and it should stay the north star through every design decision.

---

## On Labor, Gender, and Scope

The categories in this app are, if you look at them honestly, coded as women's work. Dishes. Cooking. Cleaning. Kid duty. This is not an accident and it's not a blind spot — it's the origin story. The app emerged from a specific household dynamic, and the humor lands because it names something a lot of couples recognize in themselves: an unspoken imbalance in who does what, and who notices.

We don't claim to go deeper than that. This is not a labor equity framework. It's not Fair Play. It's a scoreboard with good jokes.

**On gender:** the app is agnostic. The imbalance it reflects is traditional, but who holds which side of it varies. If the joke landed for you, you recognized your household in it. That's the whole thing. We make no assumptions about which partner is which.

**The open question: does earning income earn points?**

Right now the app tracks domestic and emotional labor exclusively. But household contribution includes things the categories don't touch: being the primary earner, managing finances, subsidizing your partner's career by absorbing more home duties so they can pursue theirs. These are real forms of labor. They're invisible in a different way.

The app doesn't track them. That's a choice worth naming. A few reasons:

- Domestic and emotional labor is the category that *already goes unnoticed* most often. Income is at least legible — there's a number on a pay stub. The dishes at 11pm have no receipt.
- Mixing financial contribution into the same scoreboard risks turning "I earn more" into a trump card that closes the conversation instead of opening it.
- The app is a mirror, not an arbitration system. Adding income could shift it toward justification.

That said: it's a genuinely open question. Some couples would want it. A settings toggle — "track financial contributions" — isn't out of bounds. It stays out of scope for now, not because the question is wrong, but because the app works better with a narrow lane.

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
- **Reset ledger** — wipe history and scores; requires confirmation (deliberate double-tap)

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
