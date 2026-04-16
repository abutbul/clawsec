#!/usr/bin/env bash
set -euo pipefail

# Sandbox regression test for hermes-attestation-guardian using an isolated Docker Hermes instance.
#
# Usage:
#   scripts/hermes_attestation_sandbox_regression.sh
#
# Optional env overrides:
#   IMAGE=python:3.11-slim
#   HERMES_AGENT_SRC=/home/davida/.hermes/hermes-agent
#   SKILL_SRC=/home/davida/clawsec/skills/hermes-attestation-guardian
#   WELL_KNOWN_PORT=8765

IMAGE="${IMAGE:-python:3.11-slim}"
HERMES_AGENT_SRC="${HERMES_AGENT_SRC:-$HOME/.hermes/hermes-agent}"
SKILL_SRC="${SKILL_SRC:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/skills/hermes-attestation-guardian}"
WELL_KNOWN_PORT="${WELL_KNOWN_PORT:-8765}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is required." >&2
  exit 1
fi
if [[ ! -d "$HERMES_AGENT_SRC" ]]; then
  echo "ERROR: HERMES_AGENT_SRC not found: $HERMES_AGENT_SRC" >&2
  exit 1
fi
if [[ ! -d "$SKILL_SRC" ]]; then
  echo "ERROR: SKILL_SRC not found: $SKILL_SRC" >&2
  exit 1
fi

echo "[sandbox] image=$IMAGE"
echo "[sandbox] hermes-agent-src=$HERMES_AGENT_SRC"
echo "[sandbox] skill-src=$SKILL_SRC"

docker run --rm \
  -e HOME=/tmp/hermes-sandbox-home \
  -e HERMES_HOME=/tmp/hermes-sandbox-home \
  -v "$HERMES_AGENT_SRC":/opt/hermes-agent:ro \
  -v "$SKILL_SRC":/opt/skill-src:ro \
  "$IMAGE" bash -lc "
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update >/dev/null
apt-get install -y --no-install-recommends openssl ca-certificates curl nodejs npm >/dev/null

cp -a /opt/hermes-agent /tmp/hermes-agent-src
python -m pip install --no-cache-dir /tmp/hermes-agent-src >/tmp/pip-install.log 2>&1
mkdir -p \"\$HOME\"

echo \"INSIDE_HOME=\$HOME\"
echo \"INSIDE_HERMES_HOME=\$HERMES_HOME\"

mkdir -p /tmp/well/.well-known/skills/hermes-attestation-guardian
cp -a /opt/skill-src/. /tmp/well/.well-known/skills/hermes-attestation-guardian/
python3 - <<'PY'
import os,json
root='/tmp/well/.well-known/skills'
sk='hermes-attestation-guardian'
base=os.path.join(root,sk)
files=[]
for dp,_,fns in os.walk(base):
  for fn in fns:
    files.append(os.path.relpath(os.path.join(dp,fn),base).replace('\\\\','/'))
idx={'generated_at':'2026-04-16T00:00:00Z','skills':[{'name':sk,'version':'0.0.1','description':'sandbox feature test','path':f'.well-known/skills/{sk}','files':sorted(files)}]}
with open(os.path.join(root,'index.json'),'w') as f: json.dump(idx,f)
PY
python3 -m http.server $WELL_KNOWN_PORT --directory /tmp/well >/tmp/http.log 2>&1 &
HPID=\$!
sleep 1

INSTALL_OUT=\$(hermes skills install \"well-known:http://127.0.0.1:$WELL_KNOWN_PORT/.well-known/skills/hermes-attestation-guardian\" --yes 2>&1)
echo \"\$INSTALL_OUT\"

echo \"\$INSTALL_OUT\" | grep -q \"Verdict: SAFE\"
echo \"\$INSTALL_OUT\" | grep -q \"Decision: ALLOWED\"

SKILL_DIR=\"\$HERMES_HOME/skills/hermes-attestation-guardian\"
mkdir -p \"\$HERMES_HOME/security/attestations\"
echo \"alpha\" > /tmp/watch.txt
echo \"anchor-v1\" > /tmp/anchor.pem
cat > /tmp/policy.json <<EOF
{\"watch_files\": [\"/tmp/watch.txt\"], \"trust_anchor_files\": [\"/tmp/anchor.pem\"]}
EOF

node \"\$SKILL_DIR/scripts/generate_attestation.mjs\" --output \"\$HERMES_HOME/security/attestations/current.json\" --policy /tmp/policy.json --generated-at 2026-04-16T00:00:00.000Z --write-sha256 >/tmp/generate.log
DIGEST=\$(cut -d\" \" -f1 \"\$HERMES_HOME/security/attestations/current.json.sha256\")
node \"\$SKILL_DIR/scripts/verify_attestation.mjs\" --input \"\$HERMES_HOME/security/attestations/current.json\" --expected-sha256 \"\$DIGEST\" >/tmp/verify-ok.log

openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:2048 -out /tmp/sign.key >/dev/null 2>&1
openssl pkey -in /tmp/sign.key -pubout -out /tmp/sign.pub.pem >/dev/null 2>&1
openssl dgst -sha256 -sign /tmp/sign.key -out /tmp/current.sig \"\$HERMES_HOME/security/attestations/current.json\"
node \"\$SKILL_DIR/scripts/verify_attestation.mjs\" --input \"\$HERMES_HOME/security/attestations/current.json\" --signature /tmp/current.sig --public-key /tmp/sign.pub.pem >/tmp/verify-sig.log

cp \"\$HERMES_HOME/security/attestations/current.json\" \"\$HERMES_HOME/security/attestations/baseline.json\"
BASE_SHA=\$(sha256sum \"\$HERMES_HOME/security/attestations/baseline.json\" | cut -d\" \" -f1)
echo \"beta\" > /tmp/watch.txt
echo \"anchor-v2\" > /tmp/anchor.pem
node \"\$SKILL_DIR/scripts/generate_attestation.mjs\" --output \"\$HERMES_HOME/security/attestations/current.json\" --policy /tmp/policy.json --generated-at 2026-04-16T00:10:00.000Z >/tmp/generate-drift.log
set +e
DRIFT_OUT=\$(node \"\$SKILL_DIR/scripts/verify_attestation.mjs\" --input \"\$HERMES_HOME/security/attestations/current.json\" --baseline \"\$HERMES_HOME/security/attestations/baseline.json\" --baseline-expected-sha256 \"\$BASE_SHA\" --fail-on-severity critical 2>&1)
DRIFT_CODE=\$?
set -e
[ \"\$DRIFT_CODE\" -ne 0 ]
echo \"\$DRIFT_OUT\" | grep -Eq \"WATCHED_FILE_DRIFT|TRUST_ANCHOR_MISMATCH\"

node \"\$SKILL_DIR/scripts/setup_attestation_cron.mjs\" --every 6h --print-only > /tmp/cron-preview.log
grep -q \"Preflight review:\" /tmp/cron-preview.log
grep -q \"# >>> hermes-attestation-guardian >>>\" /tmp/cron-preview.log

echo \"=== SANDBOX FEATURE TEST SUMMARY ===\"
echo \"install_safe_allowed=PASS\"
echo \"generate_with_policy=PASS\"
echo \"verify_expected_sha=PASS\"
echo \"verify_signature=PASS\"
echo \"baseline_drift_fail_closed=PASS\"
echo \"scheduler_preview=PASS\"

kill \$HPID >/dev/null 2>&1 || true
wait \$HPID 2>/dev/null || true
"

echo "[sandbox] completed successfully"