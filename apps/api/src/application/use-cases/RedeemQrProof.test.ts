import { describe, expect, it, vi } from 'vitest';
import { RedeemQrProof } from './RedeemQrProof.js';

describe('RedeemQrProof', () => {
  it('accepts a valid token once and rejects its replay', async () => {
    const signer = { issue: vi.fn(), verify: vi.fn().mockResolvedValue({ huntId: 'hunt-1', stepId: 'step-1', nonce: 'nonce-1', expiresAt: new Date(Date.now() + 60_000) }) };
    const replay = { claim: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false) };
    const useCase = new RedeemQrProof(signer, replay);
    await expect(useCase.execute('token')).resolves.toEqual({ status: 'VALID', huntId: 'hunt-1', stepId: 'step-1' });
    await expect(useCase.execute('token')).resolves.toEqual({ status: 'REPLAYED' });
  });

  it('fails closed when the signature is invalid', async () => {
    const useCase = new RedeemQrProof({ issue: vi.fn(), verify: vi.fn().mockResolvedValue(null) }, { claim: vi.fn() });
    await expect(useCase.execute('invalid')).resolves.toEqual({ status: 'INVALID' });
  });
});
