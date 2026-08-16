import type { QrProofReplayStore, QrProofSigner } from '../ports/outbound/QrProof.js';

export type RedeemQrProofResult =
  | { status: 'VALID'; huntId: string; stepId: string }
  | { status: 'REPLAYED' | 'INVALID' };

export class RedeemQrProof {
  constructor(private readonly signer: QrProofSigner, private readonly replay: QrProofReplayStore) {}

  async execute(token: string): Promise<RedeemQrProofResult> {
    const payload = await this.signer.verify(token);
    if (!payload) return { status: 'INVALID' };
    const claimed = await this.replay.claim(payload.nonce, payload.expiresAt);
    return claimed ? { status: 'VALID', huntId: payload.huntId, stepId: payload.stepId } : { status: 'REPLAYED' };
  }
}
