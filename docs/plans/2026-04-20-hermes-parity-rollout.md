# Hermes Attestation Guardian Parity Rollout Plan (PR-200)

Goal
Add Hermes-native capabilities aligned with clawsec-suite end behavior for:
1) signed advisory-feed verification (fail-closed), and
2) chain-of-supply verification workflow with advisory-aware guarded checks,
without copying OpenClaw hook assumptions.

Execution pattern (required by user)
For every phase, run this exact loop:
1. Builder delegate implements only that phase.
2. Scrutinizer delegate reviews only that phase (after builder finishes).
3. Builder delegate runs final fix pass based on scrutiny findings.
4. Controller validates phase, records checkpoint, then moves to next phase.

Branch
- skill/hermes-attestation-guardian-v0.0.2-hardening

Out-of-scope safety
- Do not modify unrelated local changes:
  - scripts/hermes_attestation_sandbox_regression.sh
  - docs/ (other than this plan/progress file)

---

## Phase breakdown

### Phase 1 — Advisory feed verification pipeline (start now)
Objective
Implement real signed advisory-feed ingestion/verification in Hermes skill and wire attestation feed status from actual verification result (not env-only placeholder).

Planned files
- Create: skills/hermes-attestation-guardian/lib/feed.mjs
- Create: skills/hermes-attestation-guardian/scripts/check_advisories.mjs
- Create: skills/hermes-attestation-guardian/scripts/refresh_advisory_feed.mjs
- Create: skills/hermes-attestation-guardian/test/feed_verification.test.mjs
- Modify: skills/hermes-attestation-guardian/lib/attestation.mjs
- Modify: skills/hermes-attestation-guardian/SKILL.md
- Modify: skills/hermes-attestation-guardian/README.md
- Modify: skills/hermes-attestation-guardian/skill.json

Acceptance criteria
- Verifies feed signature + checksum manifest (when present).
- Fails closed by default on invalid/missing signature artifacts.
- Supports explicit temporary unsigned bypass flag (documented danger).
- Stores Hermes feed verification state under HERMES_HOME security path.
- Attestation payload feed_verification.status is derived from real verification output.
- New feed verification tests pass.

### Phase 2 — Advisory-aware guarded supply-chain verification (Hermes-native)
Objective
Add guarded verification flow for skill artifacts with advisory-aware gating and explicit operator confirm path.

Planned files (phase-scoped)
- Create: skills/hermes-attestation-guardian/scripts/guarded_skill_verify.mjs
- Create: skills/hermes-attestation-guardian/test/guarded_skill_verify.test.mjs
- Modify: skills/hermes-attestation-guardian/lib/feed.mjs (only if needed for advisory matching helper reuse)
- Modify: skills/hermes-attestation-guardian/SKILL.md
- Modify: skills/hermes-attestation-guardian/README.md
- Modify: skills/hermes-attestation-guardian/skill.json

Acceptance criteria
- Advisory-aware check can evaluate a candidate skill name/version against verified advisory feed data.
- Guarded flow exits with a distinct non-zero code on advisory match unless explicit confirm flag is present.
- Non-matching install candidates pass verification.
- Behavior is fail-closed when feed verification artifacts are invalid/missing (unless explicit unsigned bypass is set).
- Tests cover conservative matching (no version), explicit version matching, confirm override, and fail-closed paths.

### Phase 3 — Scheduler helper integration + docs parity
Objective
Add optional scheduler helper for advisory checks and finalize docs/matrix parity language.

Planned files (phase-scoped)
- Create: skills/hermes-attestation-guardian/scripts/setup_advisory_check_cron.mjs
- Create: skills/hermes-attestation-guardian/test/setup_advisory_check_cron.test.mjs
- Modify: skills/hermes-attestation-guardian/SKILL.md
- Modify: skills/hermes-attestation-guardian/README.md
- Modify: skills/hermes-attestation-guardian/skill.json
- Modify: README.md (matrix semantics/claims parity wording if needed)
- Modify: wiki/compatibility-report.md (phase parity wording if needed)

Acceptance criteria
- Adds advisory scheduler helper with print-only default and explicit apply mode.
- Generated scheduled command uses Phase 2 guarded verification flow (not raw unsafe checks).
- Supports baseline-safe marker block/update behavior similar to existing cron helper patterns.
- Includes tests for print-only output and apply-mode guarded mutation semantics.
- Updates docs/matrix wording so Hermes capabilities are described precisely (feed verification + guarded verification + attestation scope).

---

## Progress checkpoints

### Session checkpoint
- [x] Plan saved in repo
- [x] Phase 1 builder complete
- [x] Phase 1 scrutiny complete
- [x] Phase 1 fix pass complete
- [x] Phase 1 validated + committed + pushed
- [x] Phase 2 builder complete
- [x] Phase 2 scrutiny complete
- [x] Phase 2 fix pass complete
- [x] Phase 2 validated + committed + pushed
- [x] Phase 3 builder complete
- [x] Phase 3 scrutiny complete
- [x] Phase 3 fix pass complete
- [x] Phase 3 validated + committed + pushed

### Phase 1 log
- Status: COMPLETE
- Builder run: complete
- Scrutiny run: complete (initial verdict REJECTED with concrete fix list)
- Fix run: complete
- Post-fix independent review: APPROVED
- Controller validation: complete (tests + validate_skill passed)
- Final verdict: APPROVED for Phase 1

### Phase 2 log
- Status: COMPLETE
- Builder run: complete
- Scrutiny run: complete (initial verdict APPROVED WITH FOLLOW-UPS)
- Fix run: complete
- Post-fix independent review: APPROVED
- Controller validation: complete (tests + validate_skill passed)
- Final verdict: APPROVED for Phase 2

### Phase 3 log
- Status: COMPLETE
- Builder run: complete
- Scrutiny run: complete (initial verdict APPROVED WITH FOLLOW-UPS)
- Fix run: complete
- Post-fix independent review: APPROVED
- Controller validation: complete (tests + validate_skill passed)
- Final verdict: APPROVED for Phase 3

### Resume instructions (if cutoff)
1. Open this file.
2. Continue from first unchecked item in Session checkpoint.
3. Preserve builder -> scrutinizer -> builder-fix order.
4. Commit only phase-scoped files.
