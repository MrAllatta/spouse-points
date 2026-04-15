# Ledger growth (design, space, memory)

Compressed reference for how the in-app **history / ledger** can grow and what constrains it. Implementation: `index.html` (`state.history`, `saveState`, `renderHistory`).

## Design

- **Append-only** on device: each award adds one object; **no cap or pruning** in code.
- **`#state=` sync** carries scores and pending only — **history is not transmitted**; each device keeps its own archive (`SPEC.md`).
- **UI** renders **the newest 20 rows** only (`history.slice(0, 20)`); older rows stay in data.
- **Pass** on a pending request: current flow does **not** append a ledger row (only “Give Points” does). Rows with `passed: true` may exist from older behavior; UI still supports that tag.

## Space (`localStorage`)

- Entire app state (including **full** `history`) is **`JSON.stringify`**’d into `localStorage` key `spouse-points`.
- Effective limit is **per-origin quota** (often **~5 MB** in many browsers; varies; private / managed profiles can differ or evict data).
- Typical row (short strings): **order of hundreds of bytes to ~1–2 KB** with JSON overhead; **long custom labels / `detail`** dominate growth.
- **Ballpark:** **thousands** of entries usually fine; **tens of thousands** is browser- and text-length–dependent stress territory.

## Memory and CPU

- **Load:** `JSON.parse` builds the **whole** `history` array in memory.
- **Save:** each `saveState` **re-stringifies the entire persisted object** — cost scales with **total stored state**, not “one new row.”
- Both are **O(n)** in history length (plus categories, pending, names, flags).

## Risks / edge cases

- **`localStorage.setItem` errors are ignored** (`catch {}`): persistence can **fail silently** when over quota or blocked.
- Entry **`id`** uses `Date.now()` — duplicate ids possible if two writes occur in the **same millisecond** (rare).

## When reviewing implementation

- Any change to **row shape**, **custom text fields**, or **frequency of saves** affects how fast quota is hit.
- Pagination or “load more” in the UI would not by itself reduce **storage or stringify** cost unless paired with **truncation, archival, or split storage**.
