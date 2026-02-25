/**
 * ClawSec Skill Signature Verification MCP Tool for NanoClaw
 *
 * Add this tool to /workspace/project/container/agent-runner/src/ipc-mcp-stdio.ts
 *
 * This tool verifies Ed25519 signatures on skill packages to prevent supply chain attacks.
 */

import fs from 'fs';
import path from 'path';
import { z } from 'zod';

/**
 * Helper function to generate unique request ID
 */
function generateRequestId(operation: string): string {
  return `${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Helper function to write IPC request file
 *
 * NOTE: Actual implementation requires TASKS_DIR and groupFolder from context.
 * This is a template showing the structure.
 */
function writeIpcFile(tasksDir: string, data: any): void {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`;
  const filepath = path.join(tasksDir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Helper function to wait for IPC response
 *
 * NOTE: Actual implementation requires RESULTS_DIR from context.
 * This is a template showing the structure.
 */
async function waitForResult(requestId: string, timeoutMs: number, resultsDir: string): Promise<any> {
  const resultFile = path.join(resultsDir, `${requestId}.json`);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(resultFile)) {
      const content = fs.readFileSync(resultFile, 'utf8');
      fs.unlinkSync(resultFile); // Cleanup
      return JSON.parse(content);
    }
    // Poll every 100ms
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error(`IPC timeout after ${timeoutMs}ms for request ${requestId}`);
}

/**
 * MCP Tool: clawsec_verify_skill_package
 *
 * To integrate, add this to your server.tool() calls:
 */
const EXAMPLE_TOOL_DEFINITION = `
server.tool(
  'clawsec_verify_skill_package',
  'Verify Ed25519 signature of a skill package before installation. Prevents installation of tampered or malicious skill packages by checking ClawSec signatures.',
  {
    packagePath: z.string().describe('Absolute path to skill package (.tar.gz or .zip)'),
    signaturePath: z.string().optional().describe('Path to signature file. If omitted, auto-detects <packagePath>.sig'),
  },
  async (args) => {
    const requestId = generateRequestId('verify-signature');
    const sigPath = args.signaturePath || \`\${args.packagePath}.sig\`;

    // Validate package file exists
    if (!fs.existsSync(args.packagePath)) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            valid: false,
            recommendation: 'block',
            error: \`Package file not found: \${args.packagePath}\`
          }, null, 2)
        }],
        isError: true
      };
    }

    // Write IPC request
    writeIpcFile(TASKS_DIR, {
      type: 'verify_skill_signature',
      requestId,
      groupFolder,
      timestamp: new Date().toISOString(),
      packagePath: args.packagePath,
      signaturePath: sigPath,
    });

    try {
      // Wait for host to verify (5 second timeout)
      const result = await waitForResult(requestId, 5000, RESULTS_DIR);

      if (!result.success) {
        // Service error or file not found
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: false,
              valid: false,
              recommendation: 'block',
              packagePath: args.packagePath,
              signaturePath: sigPath,
              error: result.message || 'Verification failed',
              reason: result.error?.code || 'UNKNOWN_ERROR'
            }, null, 2)
          }],
          isError: true
        };
      }

      // Check if signature is valid
      if (!result.data?.valid) {
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              valid: false,
              recommendation: 'block',
              packagePath: args.packagePath,
              signaturePath: sigPath,
              reason: result.data?.error || 'Signature verification failed',
              packageInfo: {
                sha256: result.data?.packageHash || 'unknown'
              }
            }, null, 2)
          }],
        };
      }

      // Signature valid!
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            valid: true,
            recommendation: 'install',
            packagePath: args.packagePath,
            signaturePath: sigPath,
            signer: result.data.signer,
            algorithm: result.data.algorithm,
            verifiedAt: result.data.verifiedAt,
            packageInfo: {
              size: fs.statSync(args.packagePath).size,
              sha256: result.data.packageHash
            }
          }, null, 2)
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            valid: false,
            recommendation: 'block',
            error: \`Verification timeout or error: \${error instanceof Error ? error.message : String(error)}\`
          }, null, 2)
        }],
        isError: true
      };
    }
  }
);
`;

/**
 * Export the tool definition for documentation
 */
export const clawsec_verify_skill_package_tool = {
  name: 'clawsec_verify_skill_package',
  description: 'Verify Ed25519 signature of a skill package before installation',
  parameters: {
    packagePath: 'Absolute path to skill package (.tar.gz or .zip)',
    signaturePath: 'Optional path to signature file (auto-detects .sig if omitted)'
  },
  returns: {
    success: 'boolean - Operation completed',
    valid: 'boolean - Signature is cryptographically valid',
    recommendation: '"install" | "block" | "review" - Action to take',
    signer: 'string - Identifier of signer (e.g., "clawsec")',
    algorithm: '"Ed25519" - Signature algorithm used',
    verifiedAt: 'string - ISO timestamp of verification',
    packageInfo: {
      size: 'number - Package file size in bytes',
      sha256: 'string - SHA-256 hash of package'
    },
    error: 'string - Error message if verification failed'
  }
};

/**
 * Usage example for agents
 */
export const USAGE_EXAMPLE = `
// Example 1: Verify a downloaded skill package before installation
const packagePath = '/tmp/clawsec-feed-1.0.0.tar.gz';
const verification = await tools.clawsec_verify_skill_package({
  packagePath
});

const result = JSON.parse(verification.content[0].text);

if (!result.valid) {
  console.log('⚠️ SECURITY WARNING: Signature verification failed!');
  console.log(\`Reason: \${result.reason || result.error}\`);
  console.log('DO NOT install this package - it may be tampered or malicious.');
  return;
}

console.log(\`✓ Signature valid (signer: \${result.signer})\`);
console.log(\`Package hash: \${result.packageInfo.sha256}\`);
console.log('Safe to proceed with installation.');

// Example 2: Verify with custom signature path
const verification2 = await tools.clawsec_verify_skill_package({
  packagePath: '/tmp/skill.tar.gz',
  signaturePath: '/tmp/custom-signature.sig'
});

// Example 3: Pre-flight check before installation workflow
async function installSkillSafely(packagePath) {
  // Step 1: Verify signature
  const verification = await tools.clawsec_verify_skill_package({ packagePath });
  const verifyResult = JSON.parse(verification.content[0].text);

  if (!verifyResult.valid) {
    throw new Error(\`Signature verification failed: \${verifyResult.reason}\`);
  }

  // Step 2: Check advisories
  const safety = await tools.clawsec_check_skill_safety({
    skillName: extractSkillName(packagePath)
  });

  if (!safety.safe) {
    throw new Error('Skill has known vulnerabilities');
  }

  // Step 3: Proceed with installation
  extractAndInstall(packagePath);
}
`;

/**
 * Integration checklist
 */
export const INTEGRATION_CHECKLIST = `
## Integration Checklist

### 1. Host-side Setup
- [ ] Add SkillSignatureVerifier to IpcDeps in ipc.ts
- [ ] Initialize verifier in host startup:
      const verifier = new SkillSignatureVerifier(publicKeyPath, logger);
- [ ] Add handler case in processTaskIpc switch statement
- [ ] Implement writeResponse helper for IPC responses

### 2. Container-side Setup
- [ ] Add tool definition to ipc-mcp-stdio.ts server.tool() calls
- [ ] Ensure TASKS_DIR and RESULTS_DIR constants are defined
- [ ] Implement or import writeIpcFile and waitForResult helpers
- [ ] Ensure groupFolder context variable is available

### 3. Testing
- [ ] Test with valid signed package
- [ ] Test with invalid/tampered signature
- [ ] Test with missing signature file
- [ ] Test with missing package file
- [ ] Test timeout handling (5s limit)

### 4. Documentation
- [ ] Update SKILL.md with new tool
- [ ] Add usage examples for agents
- [ ] Document public key pinning strategy
`;

// Export for ES modules
export default {
  tool: clawsec_verify_skill_package_tool,
  usageExample: USAGE_EXAMPLE,
  integrationChecklist: INTEGRATION_CHECKLIST
};
