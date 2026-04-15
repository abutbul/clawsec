# Hermes Attestation Guardian (Historical Draft Record)

Date: 2026-04-15
Owner: draft prepared for delegated implementation
Status: Implemented in repository (v0.0.1); this draft is historical context only

## 1) Proposed skill identity

Name: hermes-attestation-guardian
Why this name:
- Explicitly Hermes-scoped (no ambiguity with OpenClaw runtime skills)
- Keeps ClawSec "guardian" naming family
- Clear security function (attestation + guard)

Tagline:
"Continuously attest Hermes runtime security posture and surface drift before it becomes incident."

## 2) Product positioning (Hermes-first)

Primary audience:
- Operators running Hermes CLI/Gateway infra (Telegram/Matrix/Discord, local + remote hosts)

Non-goal:
- OpenClaw hook runtime protection
- Generic multi-agent platform abstraction beyond Hermes

Core value pillars:
1. Trust posture visibility: one signed snapshot of security state
2. Drift detection: compare baseline vs current and emit high-signal deltas
3. Operator-safe controls: no destructive remediation by default, explicit approvals required

## 3) Security outcomes

The skill should attest and diff at least:
- Enabled toolsets and risky toggles
- Messaging/gateway active state
- Signed feed verification state (where configured)
- Integrity-sensitive file hashes (operator-selected policy)
- Runtime version + dependency fingerprint summary

Priority alerts:
- unsigned mode or bypass flags enabled in production profile
- critical verification regression (signature/checksum failure)
- protected config/runtime file drift
- change in trust anchors (key fingerprint mismatch)

## 4) Hermes alignment rules (must-have)

Naming and metadata:
- skill.json name must be hermes-attestation-guardian
- platform field must be hermes
- triggers must include explicit Hermes language (avoid generic "security check" only)

Paths and side effects:
- default output under ~/.hermes/security/attestations/
- no writes to ~/.openclaw paths
- no destructive actions (quarantine/delete/restore) in MVP

Runtime/UX:
- fail closed for attestation verification errors
- operator-facing messages must separate: INFO / WARNING / CRITICAL
- remediation must be recommendation-only unless user explicitly opts in

## 5) ClawSec pipeline/distribution requirements

Based on existing repo automation, this skill must satisfy:
- skills/<name>/skill.json contains required fields: name, version, description, author, license, sbom.files
- skills/<name>/SKILL.md includes YAML frontmatter with matching version
- version parity: skill.json version == SKILL.md frontmatter version
- CHANGELOG.md must contain heading exactly:
  ## [<version>] - YYYY-MM-DD
- SBOM required file entries must exist in repo
- README.md recommended for site rendering

Release mechanics this skill should be compatible with:
- scripts/release-skill.sh version bump + URL rewrites
- .github/workflows/skill-release.yml parity/release-note checks
- utils/validate_skill.py local validation

## 6) Skeleton contents created

skills/hermes-attestation-guardian/
- skill.json
- SKILL.md
- README.md
- CHANGELOG.md
- scripts/generate_attestation.mjs
- scripts/verify_attestation.mjs
- scripts/setup_attestation_cron.mjs
- lib/diff.mjs
- test/attestation_schema.test.mjs
- test/attestation_diff.test.mjs

## 7) Delegate implementation brief

Delegate goal:
Prepare a production-ready v0.0.1 of hermes-attestation-guardian from this skeleton while keeping Hermes-only positioning and ClawSec release compatibility.

Required implementation scope:
1. Implement deterministic attestation schema + generator CLI
2. Implement verifier CLI (schema + signature/checksum hooks, fail-closed semantics)
3. Implement baseline diff engine with stable severity mapping
4. Implement cron setup helper for Hermes environments (no OpenClaw assumptions)
5. Add/expand tests for schema, diff correctness, and failure behavior
6. Keep docs and metadata aligned with actual behavior (no aspirational claims)

Acceptance checks before return:
- python utils/validate_skill.py skills/hermes-attestation-guardian
- Version parity and changelog heading satisfy skill-release policy
- Node tests in skill directory pass
- Tool/runtime side effects are explicitly documented in SKILL.md
