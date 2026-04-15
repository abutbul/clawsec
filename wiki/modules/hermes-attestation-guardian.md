# Module: Hermes Attestation Guardian

## Responsibilities
- Produce a deterministic Hermes runtime security snapshot (attestation).
- Verify attestation integrity in fail-closed mode before trust decisions.
- Compare trusted baseline vs current posture and classify drift severity.
- Provide a safe, Hermes-scoped automation path for periodic attestation checks.

## Claims from PR description (human-friendly)

| Claim | In people-speak | Where it is wired (code/config) | How we verify it |
| --- | --- | --- | --- |
| Adds deterministic attestation generation with canonicalized payload digesting. | If nothing changed in Hermes, the attestation fingerprint should stay the same. No noisy diffs from JSON ordering. | `skills/hermes-attestation-guardian/scripts/generate_attestation.mjs`, `skills/hermes-attestation-guardian/lib/attestation.mjs` (`stableStringify`, canonical digest helpers), `skills/hermes-attestation-guardian/skill.json` | `node skills/hermes-attestation-guardian/test/attestation_schema.test.mjs` checks deterministic output and digest/schema expectations. |
| Enforces fail-closed verification for schema, digest, optional expected checksum, and detached signatures. | Verification must stop with an error when integrity checks fail; never “best effort pass.” | `skills/hermes-attestation-guardian/scripts/verify_attestation.mjs`, `skills/hermes-attestation-guardian/lib/attestation.mjs`, operator notes in `skills/hermes-attestation-guardian/skill.json` and `SKILL.md` | `node skills/hermes-attestation-guardian/test/attestation_cli.test.mjs` covers tamper/error paths and non-zero exits. |
| Adds baseline authenticity and drift-severity classification for risky toggles, feed verification regressions, trust anchor drift, and watched file drift. | Baseline diff is trusted only when baseline authenticity is proven, then drift is ranked by severity so operators can act fast. | Baseline trust gates in `scripts/verify_attestation.mjs`; drift engine in `lib/diff.mjs`; docs in `README.md`/`SKILL.md` | `node skills/hermes-attestation-guardian/test/attestation_cli.test.mjs` (baseline trust/tamper) and `node skills/hermes-attestation-guardian/test/attestation_diff.test.mjs` (severity mapping). |
| Adds Hermes-only cron setup helper with managed marker block and print-only default. | Cron setup is opt-in and safe by default: it prints planned changes unless `--apply` is explicit. | `skills/hermes-attestation-guardian/scripts/setup_attestation_cron.mjs`, `skills/hermes-attestation-guardian/SKILL.md` | `node skills/hermes-attestation-guardian/test/setup_attestation_cron.test.mjs` validates print-only behavior and managed-block logic. |
| Includes output-scope/path guardrails for attestation artifacts and policy parsing safeguards. | Output writes are constrained to Hermes attestation scope, including symlink-aware escape defense. | `skills/hermes-attestation-guardian/lib/attestation.mjs` (`resolveHermesScopedOutputPath`), `scripts/generate_attestation.mjs`, `scripts/setup_attestation_cron.mjs` | `node skills/hermes-attestation-guardian/test/attestation_cli.test.mjs` includes out-of-scope and symlink-escape rejection checks. |
| Cron managed-block parser fails closed on malformed markers. | If cron markers are broken, updater refuses to rewrite instead of risking accidental deletion. | `skills/hermes-attestation-guardian/scripts/setup_attestation_cron.mjs` (`removeManagedBlock`) | `node skills/hermes-attestation-guardian/test/setup_attestation_cron.test.mjs` covers dangling start, unmatched end, and nested marker failures. |

## Key Files
- `skills/hermes-attestation-guardian/skill.json`: metadata, platform scope, operator review notes, SBOM.
- `skills/hermes-attestation-guardian/SKILL.md`: operator playbook, CLI usage, fail-closed policy.
- `skills/hermes-attestation-guardian/README.md`: quickstart and practical behavior notes.
- `skills/hermes-attestation-guardian/lib/attestation.mjs`: canonicalization, digest binding, schema checks, scoped output resolution.
- `skills/hermes-attestation-guardian/lib/diff.mjs`: baseline drift comparison and severity classification.
- `skills/hermes-attestation-guardian/scripts/generate_attestation.mjs`: deterministic attestation generation CLI.
- `skills/hermes-attestation-guardian/scripts/verify_attestation.mjs`: fail-closed verifier and baseline trust enforcement.
- `skills/hermes-attestation-guardian/scripts/setup_attestation_cron.mjs`: cron managed-block helper.

## Public Interfaces
| Interface | Consumer | Behavior |
| --- | --- | --- |
| `generate_attestation.mjs` CLI | Operators/automation | Creates canonicalized attestation JSON and optional checksum artifact. |
| `verify_attestation.mjs` CLI | Operators/automation/cron | Enforces schema/digest/signature checks and optional trusted baseline drift checks. |
| `setup_attestation_cron.mjs` CLI | Operators | Prints or applies managed cron block for scheduled generate+verify runs. |
| Diff output contract | Operators/CI | Emits severity-ranked drift findings for security triage. |

## Validation Commands
```bash
python utils/validate_skill.py skills/hermes-attestation-guardian
node skills/hermes-attestation-guardian/test/attestation_schema.test.mjs
node skills/hermes-attestation-guardian/test/attestation_diff.test.mjs
node skills/hermes-attestation-guardian/test/attestation_cli.test.mjs
node skills/hermes-attestation-guardian/test/setup_attestation_cron.test.mjs
```

## Update Notes
- 2026-04-15: Added module page for `hermes-attestation-guardian` and documented PR-claim-to-code/test traceability in human-friendly terms.

## Source References
- skills/hermes-attestation-guardian/skill.json
- skills/hermes-attestation-guardian/SKILL.md
- skills/hermes-attestation-guardian/README.md
- skills/hermes-attestation-guardian/CHANGELOG.md
- skills/hermes-attestation-guardian/lib/attestation.mjs
- skills/hermes-attestation-guardian/lib/diff.mjs
- skills/hermes-attestation-guardian/scripts/generate_attestation.mjs
- skills/hermes-attestation-guardian/scripts/verify_attestation.mjs
- skills/hermes-attestation-guardian/scripts/setup_attestation_cron.mjs
- skills/hermes-attestation-guardian/test/attestation_schema.test.mjs
- skills/hermes-attestation-guardian/test/attestation_diff.test.mjs
- skills/hermes-attestation-guardian/test/attestation_cli.test.mjs
- skills/hermes-attestation-guardian/test/setup_attestation_cron.test.mjs
- docs/plans/2026-04-15-hermes-attestation-guardian-draft.md
