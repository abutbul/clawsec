# Changelog

## [0.0.2] - 2026-04-17

- Added mandatory release verification gate guidance before install: `checksums.json`, `checksums.sig`, and pinned signing public-key fingerprint.
- Added explicit Hermes guard trust-policy note for signature-aware trust (trusted signer fingerprint allowlist) over source-name-only trust.
- Added sandbox regression script to validate clean install and core behavior in isolated HOME/HERMES_HOME (`scripts/hermes_attestation_sandbox_regression.sh`).
- Added explicit `.mjs` scan/test coverage guidance so Hermes-side scanner scope and regression harness context stay aligned with `scripts/*.mjs`, `lib/*.mjs`, and `test/*.test.mjs`.
- Updated skill metadata/docs to v0.0.2 and aligned README quickstart with fail-closed verification expectations.

## [0.0.1] - 2026-04-15

- Implemented deterministic Hermes attestation generator CLI (`scripts/generate_attestation.mjs`).
- Implemented fail-closed verifier CLI with schema, canonical digest, expected checksum, and optional detached signature checks (`scripts/verify_attestation.mjs`).
- Implemented meaningful baseline diff engine with stable severity mapping for risky toggle regressions, feed verification regressions, trust anchor drift, and watched file drift (`lib/diff.mjs`).
- Implemented Hermes-only cron setup helper with print-only default and managed-block apply mode (`scripts/setup_attestation_cron.mjs`).
- Added shared attestation library for canonicalization, schema validation, digest generation, and policy parsing (`lib/attestation.mjs`).
- Expanded tests for schema determinism, diff behavior, generator/verifier fail-closed behavior, and cron helper Hermes-only output.
- Updated metadata/docs to match actual implemented behavior and ClawSec release pipeline expectations.
