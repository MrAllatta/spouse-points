# Spouse Points — Production Hardening PR Plan (Vanilla)

Intent: turn the current prototype into production-grade software without changing stack identity (`index.html` + CSS + JavaScript + PWA; no React/framework migration).

This plan is codified as small, reviewable PRs with explicit acceptance criteria.

---

## Ground Rules

- Keep product behavior stable unless the PR explicitly says behavior change.
- Keep Courtroom Test alignment from `SPEC.md` (no features that make this feel like evidence software).
- Every PR must include:
  - a short test note in the PR body
  - docs updates for changed behavior
  - rollback note (what to revert if needed)
- No backend introduction in this sequence.

---

## Branch + PR Conventions

- Branch naming: `hardening/pr-XX-short-name`
- PR title format: `hardening(pr-XX): <outcome>`
- Labels (recommended): `hardening`, `risk:<low|med|high>`, `area:<sync|ui|pwa|docs|tests>`
- Merge rule: squash merge, keep PR number in commit message.

---

## PR Sequence

## PR-01 — Tooling bootstrap (lint/format/ci shell)

**Goal**
- Establish minimum quality gates for a vanilla repo.

**Scope**
- Add `package.json` scripts for lint/format/test placeholders.
- Add ESLint + Prettier config files.
- Add CI workflow that runs lint + format check.

**Likely files**
- `package.json` (new)
- `.eslintrc.*` (new)
- `.prettierrc*` (new)
- `.github/workflows/ci.yml` (new)
- `README.org` (how to run checks)

**Acceptance**
- CI runs on PR and fails on lint errors.
- `npm run lint` and `npm run format:check` run locally.

**Risk**
- Low.

---

## PR-02 — Test harness foundation (unit + e2e scaffolding)

**Goal**
- Create runnable automated test structure before logic moves.

**Scope**
- Add unit runner (Vitest or Jest) and first smoke tests.
- Add Playwright setup with one smoke browser test.
- Add CI jobs for unit/e2e (or unit required, e2e optional/nightly).

**Likely files**
- `vitest.config.*` or `jest.config.*` (new)
- `playwright.config.*` (new)
- `tests/unit/*` (new)
- `tests/e2e/*` (new)
- `.github/workflows/ci.yml` (update)

**Acceptance**
- Unit smoke test passes in CI.
- E2E smoke test runs locally and in CI (or documented nightly).

**Risk**
- Low to medium (CI runtime).

---

## PR-03 — Extract sync module with no behavior changes

**Goal**
- Separate packet logic from UI code while preserving behavior.

**Scope**
- Move packet encode/decode/apply logic into `src/sync.js`.
- Keep `index.html` as entrypoint; call module functions from existing handlers.
- Add baseline parity tests for `buildSyncPacket` and `applyPacket`.

**Likely files**
- `index.html` (script extraction/wiring)
- `src/sync.js` (new)
- `src/state.js` (new minimal state helpers, optional)
- `tests/unit/sync.test.js` (new)

**Acceptance**
- Existing manual sync flows still work unchanged.
- Unit tests cover current apply semantics (including local-history-not-synced behavior).

**Risk**
- Medium (touches critical path).

---

## PR-04 — Packet validator + hard reject path

**Goal**
- Treat `#state=` as untrusted input and reject bad payloads safely.

**Scope**
- Add strict packet shape validation.
- Enforce max hash payload size.
- Add non-destructive failure path (no state mutation on invalid packet).

**Likely files**
- `src/sync.js`
- `src/validation.js` (new, optional)
- `index.html` (user feedback for invalid links)
- `tests/unit/validation.test.js`

**Acceptance**
- Malformed payloads are ignored and logged/UI-notified safely.
- Prior valid local state remains intact after invalid packet attempts.

**Risk**
- Medium.

---

## PR-05 — Deterministic stale-packet guard

**Goal**
- Guarantee newest-packet-wins behavior.

**Scope**
- Centralize `ts` ordering check in one code path.
- Add tests for out-of-order links and replayed older packets.
- Document ordering policy clearly.

**Likely files**
- `src/sync.js`
- `tests/unit/sync-ordering.test.js`
- `BUILD-v2.md` (explicit policy wording)

**Acceptance**
- Opening an older link after a newer apply cannot regress state.
- A1-A4 ordering scenarios pass in automated tests (mocked unit level).

**Risk**
- Medium-high (sync correctness).

---

## PR-06 — Lifecycle resume hardening tests

**Goal**
- Make resume behavior provably stable across nav lifecycle events.

**Scope**
- Stabilize and test `pageshow` / `hashchange` / `visibilitychange` idempotency.
- Add E2E flows for resume from background with/without hash.

**Likely files**
- `index.html` and/or `src/app.js`
- `tests/e2e/lifecycle-resume.spec.js`
- `BUILD-v2.md` testing checklist updates

**Acceptance**
- No manual refresh required in covered resume scenarios.
- Duplicate lifecycle events do not double-apply or double-toast.

**Risk**
- Medium.

---

## PR-07 — Desktop handoff UX polish completion

**Goal**
- Close remaining Step 12 interaction polish.

**Scope**
- Finalize copy feedback behavior (prefer inline confirmation on button).
- Ensure floating toast does not compete with desktop handoff card.
- Add E2E/assertions for copy states.

**Likely files**
- `index.html` (desktop handoff/toast logic)
- `tests/e2e/desktop-handoff.spec.js`
- `BUILD-v2.md` (mark final QA row when done)

**Acceptance**
- Copy flow feels singular and predictable (no stale/competing toast).
- Desktop QA checklist rows can be marked complete with evidence.

**Risk**
- Low to medium.

---

## PR-08 — PWA reliability + version visibility

**Goal**
- Make shipped builds diagnosable and update behavior predictable.

**Scope**
- Version cache names intentionally.
- Add app build/version display in settings/footer.
- Add simple SW update notes/reload affordance if needed.

**Likely files**
- `sw.js`
- `manifest.json` (if version metadata included)
- `index.html` (version display/update hint)
- `README.org` (release/version note)

**Acceptance**
- Users and testers can report exact build version.
- SW updates do not leave users silently stuck on stale shell.

**Risk**
- Medium (cache behavior).

---

## PR-09 — Supportability: debug report + runbook

**Goal**
- Improve bug triage speed without adding invasive analytics.

**Scope**
- Add "Copy debug report" action (safe metadata only).
- Add support runbook doc with repro template and known issues.
- Optional lightweight client-side error counters (non-sensitive).

**Likely files**
- `index.html` (debug copy action)
- `docs/support.md` (new)
- `README.org` (link to support flow)

**Acceptance**
- Testers can provide consistent repro payload quickly.
- Triage doc exists and matches live behavior.

**Risk**
- Low.

---

## PR-10 — Security/docs release gate

**Goal**
- Establish baseline production policy posture.

**Scope**
- Add `privacy.html` and `terms.html`.
- Add deployment notes for security headers/CSP at host layer.
- Add concise threat model doc for link-sharing risks.

**Likely files**
- `privacy.html` (new)
- `terms.html` (new)
- `docs/threat-model.md` (new)
- `README.org` (policy + deployment links)

**Acceptance**
- Public-facing legal docs are present.
- Threats/mitigations are documented and reviewable.

**Risk**
- Low.

---

## Definition of Done (Program Level)

The hardening sequence is complete when:

- CI enforces lint + unit tests on every PR.
- Sync correctness (`#state=` validation + stale guard) is covered by automated tests.
- Lifecycle resume and desktop copy/handoff edge cases are validated in E2E.
- PWA update/version diagnostics are practical for real tester reports.
- Support and policy docs exist and are linked from `README.org`.
- Product remains vanilla-stack and no backend was introduced.

---

## Execution Notes

- If time is constrained, do PR-01 through PR-06 first; that yields most risk reduction.
- Keep PRs under ~300 changed lines where possible; split further when sync and UI changes mix.
- After each merged PR, run the `BUILD-v2.md` regression checklist if sync/request/award flows were touched.

