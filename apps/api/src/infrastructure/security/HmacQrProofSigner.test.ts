import { describe, expect, it } from 'vitest';
import { HmacQrProofSigner } from './HmacQrProofSigner.js';

const signer = new HmacQrProofSigner('test-only-secret', { maxTtlMs: 300_000 });

describe('HmacQrProofSigner', () => {
  it('issues and verifies a bounded token without exposing the secret', async () => {
    const payload = { huntId: 'hunt-1', stepId: 'step-1', nonce: 'nonce-1', expiresAt: new Date(Date.now() + 60_000) };
    const token = await signer.issue(payload);
    await expect(signer.verify(token)).resolves.toMatchObject(payload);
    expect(token).not.toContain('test-only-secret');
  });

  it('rejects tampered and expired tokens', async () => {
    const token = await signer.issue({ huntId: 'hunt-1', stepId: 'step-1', nonce: 'nonce-2', expiresAt: new Date(Date.now() + 60_000) });
    const tampered = `${token.slice(0, -1)}${token.endsWith('a') ? 'b' : 'a'}`;
    await expect(signer.verify(tampered)).resolves.toBeNull();
    await expect(signer.issue({ huntId: 'hunt-1', stepId: 'step-1', nonce: 'nonce-3', expiresAt: new Date(Date.now() - 1) })).rejects.toThrow('QR_PROOF_EXPIRY_INVALID');
  });
});
