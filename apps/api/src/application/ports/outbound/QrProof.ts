export type QrProofPayload = { huntId: string; stepId: string; nonce: string; expiresAt: Date };

export interface QrProofSigner {
  issue(payload: QrProofPayload): Promise<string>;
  verify(token: string): Promise<QrProofPayload | null>;
}

export interface QrProofReplayStore {
  claim(nonce: string, expiresAt: Date): Promise<boolean>;
}
