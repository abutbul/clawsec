# ClawHub Security Simulation Report (Picoclaw packages)

- Generated: 2026-04-26T00:20:54
- Method: static heuristic simulation (lexical moderation + behavioral code-risk patterns)
- Scope: `skills/picoclaw-security-guardian`, `skills/picoclaw-self-pen-testing`

## picoclaw-security-guardian
- Verdict: **PASS**
- Moderation wording score: `1`
- Behavioral/code-risk score: `0`
- Top moderation-sensitive hits:
  - `skills/picoclaw-security-guardian/CHANGELOG.md:6` → `self-pen` (moderation-sensitive token)
- Top behavioral/code-risk hits: none

## picoclaw-self-pen-testing
- Verdict: **PASS**
- Moderation wording score: `6`
- Behavioral/code-risk score: `0`
- Top moderation-sensitive hits:
  - `skills/picoclaw-self-pen-testing/skill.json:2` → `self-pen` (moderation-sensitive token)
  - `skills/picoclaw-self-pen-testing/CHANGELOG.md:6` → `self-pen` (moderation-sensitive token)
  - `skills/picoclaw-self-pen-testing/SKILL.md:2` → `self-pen` (moderation-sensitive token)
  - `skills/picoclaw-self-pen-testing/SKILL.md:44` → `self-pen` (moderation-sensitive token)
  - `skills/picoclaw-self-pen-testing/SKILL.md:45` → `self-pen` (moderation-sensitive token)
  - `skills/picoclaw-self-pen-testing/README.md:1` → `self-pen` (moderation-sensitive token)
- Top behavioral/code-risk hits: none

## Interpretation
- `picoclaw-security-guardian` is now mostly clean; only residual lexical hit is the split-package name in changelog history.
- `picoclaw-self-pen-testing` is isolated by design; residual moderation risk is lexical (`self-pen` in package/file names), not behavioral code risk.

## Suggested visibility hardening
1. Keep `picoclaw-security-guardian` as default public package.
2. If ClawHub flags `picoclaw-self-pen-testing`, publish with a neutral alias package name while preserving current package for internal lanes.
3. Continue avoiding exploit/network-execution primitives in both packages (current behavioral score is clean).