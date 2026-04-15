#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildAttestation,
  computeCanonicalDigest,
  parseAttestationPolicy,
  stableStringify,
  validateAttestationSchema,
  validateDigestBinding,
} from "../lib/attestation.mjs";

async function withTempDir(run) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hag-schema-"));
  try {
    await run(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

async function testBuildAttestationIsSchemaValidAndDeterministic() {
  await withTempDir(async (tempDir) => {
    const watchedFile = path.join(tempDir, "watch.txt");
    const trustAnchor = path.join(tempDir, "anchor.pem");
    await fs.writeFile(watchedFile, "watch-contents\n", "utf8");
    await fs.writeFile(trustAnchor, "trust-anchor\n", "utf8");

    const policy = parseAttestationPolicy(
      JSON.stringify({ watch_files: [watchedFile], trust_anchor_files: [trustAnchor] }),
    );

    const generatedAt = "2026-04-15T18:00:00.000Z";
    const first = buildAttestation({ generatedAt, policy });
    const second = buildAttestation({ generatedAt, policy });

    assert.deepEqual(first, second, "attestation must be deterministic for fixed inputs");
    assert.equal(first.platform, "hermes");
    assert.equal(first.schema_version, "0.0.1");
    assert.equal(first.generated_at, generatedAt);

    const schemaErrors = validateAttestationSchema(first);
    assert.equal(schemaErrors.length, 0, `schema errors: ${schemaErrors.join(", ")}`);

    const computedDigest = computeCanonicalDigest(first);
    assert.equal(first.digests.canonical_sha256, computedDigest, "digest must match canonical payload");

    const stableOne = stableStringify(first);
    const stableTwo = stableStringify(second);
    assert.equal(stableOne, stableTwo, "stable stringify should produce same output ordering");
  });
}

function testSchemaValidationFailsClosed() {
  const invalid = {
    schema_version: "0.0.0",
    platform: "openclaw",
    generated_at: "not-a-date",
    digests: { canonical_sha256: "1234" },
  };
  const errors = validateAttestationSchema(invalid);
  assert.ok(errors.length >= 4, "invalid schema should emit multiple errors");
  assert.ok(errors.some((msg) => msg.includes("platform must be hermes")));
}

function testDigestBindingRejectsUnsupportedAlgorithm() {
  const attestation = buildAttestation({ generatedAt: "2026-04-15T18:00:00.000Z" });
  attestation.digests.algorithm = "sha1";

  const schemaErrors = validateAttestationSchema(attestation);
  assert.ok(schemaErrors.some((msg) => msg.includes("digests.algorithm must be sha256")));

  const digestBindingError = validateDigestBinding(attestation);
  assert.ok(digestBindingError?.includes("unsupported digest algorithm"));
}

await testBuildAttestationIsSchemaValidAndDeterministic();
testSchemaValidationFailsClosed();
testDigestBindingRejectsUnsupportedAlgorithm();
console.log("attestation_schema.test.mjs: ok");
