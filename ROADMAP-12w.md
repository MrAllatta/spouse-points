# Spouse Points — 12-week roadmap (slow burn)

**Intent:** Shippable **shareable** loop + a **sustainable rhythm** of small ships and posts — not one viral moment, not feature bloat.

**Assumptions:** Mostly solo time. **~1 small post** when something real ships; a **second** post in a week only if you have energy (screenshot, quote, story — not always release notes).

**References:** Execution detail lives in `BUILD-v2.md`. Product truth lives in `SPEC.md`.

**Repo status (2026-04-13):** In this tree, `BUILD-v2.md` **Steps 1–10** are implemented in `index.html` (URL sync, SMS handoffs, settings, category CRUD, PWA shell). Treat rows below as **cadence / verification / narrative** guides; several “weeks” landed together in one push. Next honest gaps are **real-device QA**, **hardening**, and **optional** week 10–12 items (tips, PDF, edge-case pass) — not missing core loop code.

---

## Pre-beta clarity gate (before wider testers)

**Intent:** No broader beta share until first-use behavior is obvious to a tired human with no coaching.

**Required product changes before recruiting testers:**
- **Forced name onboarding:** block award/request actions until both local names are set (you + spouse). This is not optional setup chrome.
- **Post-name micro-moment + immediate action:** right after names are entered, show only:
  - "This isn't a real score."
  - "It's just a way to notice each other more."
  Then immediately route to a clear tappable action so they *do*, not read.
- **No visible A/B language:** keep slotting internals for sync logic, but remove A/B wording from UI copy and SMS body.
- **Caveman copy pass:** simplify action labels and helper text to plain one-step language (e.g., "I noticed you did X", "I did X, notice me", "Give points", "Not this one").
- **One-message vocabulary:** the same plain-language frame must appear in button labels, toasts, and precomposed SMS text.
- **No lecture copy:** avoid onboarding philosophy blocks or manifesto-style explanation; first-use should stay short and action-first.
- **Request/award visibility integrity:** after request send, do not show awarded state on the request sender's UI. Awarded state must appear on the receiver first and only propagate back when the receiver completes award + return sync.
- **Desktop handoff strategy:** detect non-mobile and switch from `sms:` auto-open to copy-first UX. Do not auto-open Messages on desktop; show "Copy this and send it to [Name]" and a large **Copy Message** button.

**Gate test (single exhausted parent):**
- Give only one prompt: "Use this with your partner."
- Observe first-use path: onboarding, award, request, and SMS handoff.
- **Pass condition:** they do **not** ask, "Wait, what am I supposed to do?"
- **Fail condition:** any confusion on core loop intent or next action blocks wider beta until fixed.

**Beta tester interview questions (ask directly):**
- "When did this feel annoying?"
- "Did you ever not want to send points?"
- "Did anything feel unfair or weirdly real?"
- "Would you keep using this if I didn't ask you to?"
- "Did this make you notice me more, or just the app more?"

**Interpretation rule:** if answers lean toward "I noticed the app more," quietly panic and adjust. That means we are drifting from mirror-to-relationship toward app-as-center.

**Status (2026-04-14):** forced names + no visible A/B language + copy/vocabulary pass + desktop copy-first handoff are implemented in `index.html`; exhausted-parent gate test remains required before wider beta sharing.

---

## Weeks 1–3 — Make it shareable (non-negotiable)

| Week | Build | Ship / verify | Post / surface |
|------|--------|----------------|----------------|
| **1** | Fixed `pointValues` map; replace random 1–3 in `awardPoints()` and `resolveRequest()` (see `BUILD-v2` Step 1). | Same device: predictable points; birth still 1,000,000. | Quiet — or “we killed the dice roll” if you want tone. |
| **2** | `#state=` encode/decode, `applyPacket`, load strip hash (`BUILD-v2` Step 2). | Two tabs or two browsers: shared link → scores + pending match. | Short post: **text your partner the scoreboard** + screenshot of two tabs. |
| **3** | `sms:` handoff on **award** (mobile); desktop = show/copy URL in toast (`BUILD-v2` Step 3). | Real phone test with partner or second device. | **Anchor post:** problem (same couch, invisible labor) → punchline (app) → link. |

**End of week 3:** The app is actually a slow-burn vehicle — without this, the rest is local novelty.

---

## Weeks 4–6 — Complete the couple loop + align with spec

| Week | Build | Ship / verify | Post / surface |
|------|--------|----------------|----------------|
| **4** | SMS + link on **request** path (`BUILD-v2` Step 4); **return SMS** when partner awards pending (`BUILD-v2` Step 5). | Request → text → partner opens → pending appears → award → requester gets link. | “Requests are texts. Awards are texts. No ghost awards.” |
| **5** | **Pass = silent:** no ledger row; clear pending only (`BUILD-v2` Step 6). Soften button copy (“Not this one”). | Pass clears pending; award still logs. | Optional micro-post: **pass is silence** — people who get the spec will get it. |
| **6** | **1× / 2× / 3×** multiplier on award only; hidden in request mode (`BUILD-v2` Step 7). | Sanity-check points math. | Light humor or comment under week 4: “when they really earned it.” |

**End of week 6:** Core mechanic story matches `SPEC.md`; you can talk about the product without apologizing for prototype gaps.

---

## Weeks 7–9 — Stickiness + “years of use” hygiene

| Week | Build | Ship / verify | Post / surface |
|------|--------|----------------|----------------|
| **7** | Slide-up **settings:** names (`BUILD-v2` Step 8). **No** in-app full reset — matches `SPEC.md` *Design choice: In-app reset*. | Rename partners; confirm no wipe-ledger control ships. | Optional: “defaults are theirs to edit” if you post settings at all. |
| **8** | Per-category **point overrides** + **category CRUD** in the same panel (local only; catalog **not** in `#state=` — `BUILD-v2` Steps 8–9). | Change e.g. coffee → 3; add/reorder/delete a category; reload; award checks out. Pending rows still resolve sensibly on the partner phone. | Dev whisper or skip posting — maintenance week. |
| **9** | **PWA:** `manifest.json`, icons, head meta, `sw.js` app-shell caching (`BUILD-v2` Step **10**). | Install on iOS + Android; offline open once. | **Second anchor post:** home screen app, no account, no server. |

**End of week 9:** Installable, configurable enough to not feel frozen; couples who need a blank slate use OS-level data removal (same as spec).

---

## Weeks 10–12 — Small monetization door + rhythm lock-in

| Week | Build | Ship / verify | Post / surface |
|------|--------|----------------|----------------|
| **10** | Footer or settings: **“Support the bit”** → Ko-fi, Stripe Payment Link, or Buy Me a Coffee (pick one). | Tap-through on mobile; fees acceptable. | One line in a longer piece, or footer-only for a week — no guilt framing. |
| **11** | **PWYW one-pager PDF** (fridge rules + blank lines) or fastest printable “kitchen ledger” — same tip platform or Gumroad. | You would complete checkout in under 60 seconds. | “If you want paper, we made paper.” |
| **12** | **Hardening:** bad `#state=` hash, long payload, desktop SMS path, empty states, copy pass. | Run `BUILD-v2.md` testing checklist for shipped scope. | **Quarter recap:** what it is, what it isn’t, link, tip — optional invite (“weirdest category idea”). |

**End of week 12:** Shareable PWA + one soft revenue path + twelve weeks of proof you can show up without a second viral hit.

---

## Cross-cutting (all 12 weeks)

- **Niche seeding (low effort):** When something ships, **one** non-spammy note in a community that fits (parent humor, teachers, adulting corners) — not every week; **weeks 3, 6, 9, 12** are enough if you dislike this.
- **Scope guard:** No decay, no backend, no accounts in this block — matches `BUILD-v2` out-of-scope list.
- **Tooling / tokens:** Time-box builds to **2–3 focused blocks per week**; reserve stronger models for **copy** on anchor weeks **3, 6, 9, 12** if you want prose to travel.
- **Mirror over race:** In UI and SMS copy, treat **running totals as secondary** to the gesture (category, quip, ledger line). Numbers stay for sync and legibility early on; they should not train “who has more” as the emotional headline — see `SPEC.md` (*Debate: Scoreboard numbers…*, Open Question **7**).
- **Defaults are editable caricature:** Category grid and calendar-flavored examples are **starting stereotypes the couple rewrites** (settings, custom lines); seasonal / cultural stance lives in `SPEC.md` (*Seasonal labor, default spaces…*).
- **After real thread mileage:** Revisit whether headline totals still belong once weeks **3–6** have been lived with on phones, not only in theory.

---

## If you slip a week

**Do not slip weeks 1–3.** Everything else can slide right. Weeks 7–8 can merge if needed. PWA can land as late as week 10 if you prioritize **Messages + URL** first — that is the correct trade for a shareable slow burn.

---

*Living document — revise dates or scope when reality shifts.*
