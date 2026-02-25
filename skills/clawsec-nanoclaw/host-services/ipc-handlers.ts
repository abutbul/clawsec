/**
 * ClawSec Advisory Feed IPC Handler Additions for NanoClaw
 *
 * Add this case to the switch statement in /workspace/project/src/ipc.ts
 * inside the processTaskIpc function.
 *
 * This handler processes advisory cache refresh requests from agents.
 */

// Add to IpcDeps interface:
export interface IpcDeps {
  // ... existing deps
  advisoryCacheManager?: AdvisoryCacheManager;
  signatureVerifier?: SkillSignatureVerifier;  // Add for Phase 1
}

// Add to processTaskIpc switch statement:

case 'refresh_advisory_cache':
  // Any group can request cache refresh (rate-limited by cache manager)
  logger.info({ sourceGroup }, 'Advisory cache refresh requested via IPC');
  if (deps.advisoryCacheManager) {
    try {
      await deps.advisoryCacheManager.refresh();
      logger.info({ sourceGroup }, 'Advisory cache refreshed successfully');
    } catch (error) {
      logger.error({ error, sourceGroup }, 'Advisory cache refresh failed');
    }
  } else {
    logger.warn({ sourceGroup }, 'Advisory cache manager not initialized');
  }
  break;

case 'verify_skill_signature': {
  // Skill signature verification (Phase 1)
  const { requestId, packagePath, signaturePath, publicKeyPem, allowUnsigned } = task;

  logger.info({ sourceGroup, requestId, packagePath }, 'Verifying skill signature');

  try {
    if (!deps.signatureVerifier) {
      throw new Error('Signature verification service not available');
    }

    const result = await deps.signatureVerifier.verify({
      packagePath,
      signaturePath,
      publicKeyPem,
      allowUnsigned: allowUnsigned || false,
    });

    await writeResponse(requestId, {
      success: true,
      message: result.valid ? 'Signature valid' : 'Signature invalid',
      data: result,
    });

    logger.info(
      { sourceGroup, requestId, valid: result.valid, signer: result.signer },
      'Signature verification completed'
    );
  } catch (error) {
    logger.error({ error, sourceGroup, requestId, packagePath }, 'Signature verification failed');

    const errorCode = error.code || 'CRYPTO_ERROR';
    await writeResponse(requestId, {
      success: false,
      message: error.message || 'Verification failed',
      error: {
        code: errorCode,
        details: error
      }
    });
  }
  break;
}
