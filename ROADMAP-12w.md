# Spouse Points — 12-week roadmap (slow burn)

**Intent:** Shippable **shareable** loop + a **sustainable rhythm** of small ships and posts — not one viral moment, not feature bloat.

**Assumptions:** Mostly solo time. **~1 small post** when something real ships; a **second** post in a week only if you have energy (screenshot, quote, story — not always release notes).

**References:** Execution detail lives in `BUILD-v2.md`. Product truth lives in `SPEC.md`.

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
| **4** | SMS + link on **request** path (`BUILD-v2` Step 4). | Request → text → partner opens → pending appears. | “Requests are texts. Awards are texts. No ghost awards.” |
| **5** | **Pass = silent:** no ledger row; clear pending only (`BUILD-v2` Step 5). Soften button copy (“Not this one”). | Pass clears pending; award still logs. | Optional micro-post: **pass is silence** — people who get the spec will get it. |
| **6** | **1× / 2× / 3×** multiplier on award only; hidden in request mode (`BUILD-v2` Step 6). | Sanity-check points math. | Light humor or comment under week 4: “when they really earned it.” |

**End of week 6:** Core mechanic story matches `SPEC.md`; you can talk about the product without apologizing for prototype gaps.

---

## Weeks 7–9 — Stickiness + “years of use” hygiene

| Week | Build | Ship / verify | Post / surface |
|------|--------|----------------|----------------|
| **7** | Slide-up **settings:** names centralized if needed; **reset** with double confirm (`BUILD-v2` Step 7, partial). | Rename partners + reset flow. | “We added a nuclear reset. For couples who need a fresh sheet.” |
| **8** | Optional: per-category **point overrides** in settings (local only; **not** in sync packet per `BUILD-v2`). | Change e.g. coffee → 3, reload, award checks out. | Dev whisper or skip posting — maintenance week. |
| **9** | **PWA:** `manifest.json`, icons, head meta, `sw.js` cache-first for `./` + `index.html` (`BUILD-v2` Step 8). | Install on iOS + Android; offline open once. | **Second anchor post:** home screen app, no account, no server. |

**End of week 9:** Installable, resettable, configurable enough to not feel frozen.

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

---

## If you slip a week

**Do not slip weeks 1–3.** Everything else can slide right. Weeks 7–8 can merge if needed. PWA can land as late as week 10 if you prioritize **Messages + URL** first — that is the correct trade for a shareable slow burn.

---

*Living document — revise dates or scope when reality shifts.*
