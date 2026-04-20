# hermes-attestation-guardian

Hermes-only security attestation and drift detection skill.

Status: implemented (v0.0.2), Hermes-only.

## What it does

- Generates deterministic Hermes runtime posture attestations.
- Verifies attestation schema + canonical digest with fail-closed semantics.
- Optionally verifies detached signatures using a provided public key.
- Fails closed on baseline diffing unless baseline authenticity is verified (trusted digest and/or detached signature).
- Restricts attestation output writes to Hermes attestation scope (`$HERMES_HOME/security/attestations`).
- Compares baseline vs current attestations with stable severity classification.
- Provides Hermes-native advisory feed verification state (signed feed + optional checksums) under `$HERMES_HOME/security/advisories`.
- Adds advisory-aware guarded skill verification flow with conservative name gating and explicit `--confirm-advisory` override.
- Provides an optional Hermes-oriented cron setup helper (print-only by default).

## Scope boundaries

In scope:
- Hermes environment posture snapshots
- deterministic baseline diffing
- fail-closed verification semantics
- Hermes optional scheduling helper

Out of scope / unsupported (v0.0.2):
- OpenClaw runtime hooks (unsupported)
- destructive auto-remediation
- automatic rollback of runtime configuration
- remote advisory URL allowlisting is not implemented yet (operator must explicitly trust configured advisory endpoints)
- guarded advisory version matching does not implement full npm semver range grammar (currently limited to direct comparators, caret/tilde, and wildcard matching)

## Quickstart

Canonical release verification and trust-policy guidance lives in `SKILL.md`:
- `Mandatory release verification gate (before install)`
- `Hermes guard trust policy note`

After running that gate, use the commands below.

```bash
node scripts/generate_attestation.mjs
node scripts/verify_attestation.mjs --input ~/.hermes/security/attestations/current.json
node scripts/refresh_advisory_feed.mjs
node scripts/check_advisories.mjs
node scripts/guarded_skill_verify.mjs --skill some-skill --version 1.2.3
node scripts/setup_attestation_cron.mjs --every 6h --print-only
```

## Hermes guard trust policy recommendation

When installing community-sourced skill bundles, prefer Hermes guard signature-aware trust policy (trusted signer fingerprint allowlist) over source-name-only trust. Unknown signer fingerprints should remain community policy and invalid signatures should stay blocked.

## Hermes scan/test context (.mjs coverage)

For canonical `.mjs` scan/test scope guidance, see `SKILL.md` -> `Notes`.

## Tests

```bash
node test/attestation_schema.test.mjs
node test/attestation_diff.test.mjs
node test/attestation_cli.test.mjs
node test/setup_attestation_cron.test.mjs
node test/feed_verification.test.mjs
node test/guarded_skill_verify.test.mjs
```
