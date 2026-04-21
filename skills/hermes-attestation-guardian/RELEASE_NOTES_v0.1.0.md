# hermes-attestation-guardian v0.1.0 (draft)

Release type: minor
Date: 2026-04-21

## Summary

This release consolidates Hermes parity hardening work and improves release/operator readiness for ClawHub distribution.

## Highlights

- Sandbox regression harness moved into the skill-owned test surface:
  - `test/hermes_attestation_sandbox_regression.sh`
- Advisory feed verification hardened:
  - when checksum-manifest verification is enabled, both `checksums.json` and `checksums.json.sig` are now required (fail-closed if missing).
- Added explicit regression coverage for missing checksum-manifest artifacts (local and remote paths).
- Reduced cron setup drift risk by centralizing managed-block helper logic in `lib/cron.mjs` and reusing it from both scheduler scripts.
- Updated Hermes docs/runtime metadata for cleaner ClawHub publishing semantics.
- Removed compatibility-report wiki dependency; README matrix is now the canonical capability snapshot.

## Security posture impact

- Stronger fail-closed behavior for advisory verification state.
- Safer long-term maintenance for scheduler setup logic (less duplicated code).
- Maintains safe-install pass path in sandbox regression workflow.

## Operator impact

No breaking operational change is expected for standard Hermes flows. Operators should continue using signed advisory feeds and avoid persistent `--allow-unsigned` in recurring jobs.

## Verification commands

```bash
node test/feed_verification.test.mjs
node test/setup_attestation_cron.test.mjs
node test/setup_advisory_check_cron.test.mjs
node test/guarded_skill_verify.test.mjs
bash test/hermes_attestation_sandbox_regression.sh
```
