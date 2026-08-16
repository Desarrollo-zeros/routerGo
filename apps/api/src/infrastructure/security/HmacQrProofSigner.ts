import { createHmac, timingSafeEqual } from 'node:crypto';
import type { QrProofPayload, QrProofSigner } from '../../application/ports/outbound/QrProof.js';

export type QrProofSignerConfig = { maxTtlMs: number };

export class HmacQrProofSigner implements QrProofSigner {
  constructor(private readonly secret: string, private readonly config: QrProofSignerConfig) {
    if (!secret || config.maxTtlMs <= 0) throw new Error('QR_PROOF_CONFIG_INVALID');
  }

  async issue(payload: QrProofPayload): Promise<string> {
    if (!validPayload(payload, this.config)) throw new Error('QR_PROOF_EXPIRY_INVALID');
    const body = encode(JSON.stringify({ ...payload, expiresAt: payload.expiresAt.getTime() }));
    return `${body}.${encode(sign(this.secret, body))}`;
  }

  async verify(token: string): Promise<QrProofPayload | null> {
    const parts = token.split('.');
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    const expected = sign(this.secret, parts[0]);
    const actual = Buffer.from(parts[1], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return decodePayload(parts[0], this.config);
  }
}

function validPayload(payload: QrProofPayload, config: QrProofSignerConfig): boolean {
  const ttl = payload.expiresAt.getTime() - Date.now();
  return Boolean(payload.huntId && payload.stepId && payload.nonce)
    && Number.isFinite(payload.expiresAt.getTime()) && ttl > 0 && ttl <= config.maxTtlMs;
}

function sign(secret: string, body: string): Buffer {
  return createHmac('sha256', secret).update(body, 'utf8').digest();
}

function encode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function decodePayload(body: string, config: QrProofSignerConfig): QrProofPayload | null {
  try {
    const value: unknown = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!value || typeof value !== 'object') return null;
    const raw = value as Record<string, unknown>;
    if (typeof raw.huntId !== 'string' || typeof raw.stepId !== 'string' || typeof raw.nonce !== 'string' || typeof raw.expiresAt !== 'number') return null;
    const payload = { huntId: raw.huntId, stepId: raw.stepId, nonce: raw.nonce, expiresAt: new Date(raw.expiresAt) };
    return validPayload(payload, config) ? payload : null;
  } catch {
    return null;
  }
}
