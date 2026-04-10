# Spouse Points — Build Spec

A shared scoreboard for couples that makes domestic labor and emotional effort visible, named, and credited. Not a task manager. Not a chore chart. A mirror.

> "A little scoreboard helps us laugh while we learn to notice each other."

---

## What This Is (and Isn't)

Every app in this space — Chore Wars, OurHome, Sweepy — is fundamentally task management with points bolted on. They answer "who did what."

Spouse Points answers something softer: *did you notice?*

The categories that matter most here aren't chores. "Didn't sigh." "Held tongue." "Actually listened." Nobody else is tracking those. That's the product differentiation, and it should stay the north star through every design decision.

---

## Core Mechanics

### 1. Award Points
One partner notices something the other did and awards points for it. Spontaneous noticing is the primary gesture the app is designed to encourage.

- Recipient is the partner who did the thing
- Category selected from a fixed grid (or freeform)
- Points awarded: base value, randomized within a range (current: 1–3)
- A quip surfaces on award — dry, specific, not generic

### 2. Request Points
A partner flags that they did something and would like acknowledgment. The request surfaces to the other partner for resolution.

- Requester selects themselves as the subject
- Category + optional note
- Drops into a **Pending** queue visible to both
- Other partner resolves: **Award it** or **Pass**

Award: points scored, entry in ledger tagged `requested`  
Pass: entry in ledger tagged `passed`, greyed out — filed quietly

### 3. The Ledger
Running history of all activity. Three entry types:
- Spontaneous award (no tag)
- Requested + awarded (`requested`)
- Requested + passed (`passed`)

The ratio between these over time is the real signal. A ledger heavy with `passed` entries tells you something the scoreboard doesn't.

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

### Point Weighting
Base point values per category, with an optional multiplier the awarder sets at time of award. "You did the dishes — 2 points. You did them without being asked for the third week running — that felt like more."

The multiplier should be simple: 1× / 2× / 3×. Not a slider.

### Pairing
Two partners share a single ledger. Connection flow:
1. One partner opens the app, generates a 6-character invite code
2. Text it to the other partner
3. They enter the code — linked

No email required. No accounts in the friction-heavy sense. The code is the handshake.

### Notifications
Push notification when your partner awards you points. The quip is the notification body.

Possible: a gentle nudge after N days with no activity. ("The ledger is quiet. Someone must have been perfect.")

### Stack
| Layer | Choice | Rationale |
|---|---|---|
| Frontend | Vanilla JS or lightweight React | Doesn't need much |
| Backend | Supabase | Free tier, Postgres, real-time, auth built in |
| Decay calc | Read-time, client-side | No cron jobs needed |
| Notifications | Supabase Edge Functions → push | Simple path |

---

## Open Design Questions

**1. Are requested points worth the same as spontaneous ones?**

Two valid positions:
- *Same value* — asking for acknowledgment takes courage; the effort was real regardless
- *Less value* — spontaneous noticing is the whole point; requesting is a fallback, not a win

Current implementation: same value. Worth revisiting after real use.

---

**2. Does the requester see when their request is passed?**

Right now: passed requests appear in the ledger visible to both. That's honest but potentially punishing.

Alternative: passed requests are only visible to the requester (private passed count). The awarder just sees the request disappear.

The tension: visibility might create accountability. Invisibility might prevent score-keeping resentment about score-keeping.

---

**3. Can you award points to yourself?**

Current mock: the recipient toggle allows any combination — either partner can award either partner, including themselves.

Argument for blocking self-award: the core gesture is one person *noticing* another. Self-reporting breaks that.

Argument for allowing it: in a real two-device scenario, you'd log your own actions before handing the phone over. The "noticing" moment is still the partner's resolution.

Likely resolution: in the single-device mock, allow it. In the real paired app, block direct self-award — use Request instead.

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
- Decay
- Point weighting / multipliers
- Two-device pairing
- Notifications
- Any backend

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
