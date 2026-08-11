import { ActivitySession } from '../../../../domain/entities/ActivitySession';

export interface ActivityRow {
  id: string;
  user_id: string;
  wallet_id: string;
  status: string;
  reps: number;
  challenge_nonce: string;
  created_at: string | Date;
  updated_at: string | Date;
  verified_at: string | Date | null;
  rejected_reason: string | null;
}

export const ActivitySessionMapper = {
  toDomain(row: ActivityRow): ActivitySession {
    return ActivitySession.create({
      id: row.id,
      userId: row.user_id,
      walletId: row.wallet_id,
      status: row.status as never,
      reps: row.reps,
      challengeNonce: row.challenge_nonce,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      verifiedAt: row.verified_at ? new Date(row.verified_at) : null,
      rejectedReason: row.rejected_reason,
    });
  },
  toRow(e: ActivitySession): ActivityRow {
    const p = e.toProps();
    return { id: p.id, user_id: p.userId, wallet_id: p.walletId, status: p.status, reps: p.reps, challenge_nonce: p.challengeNonce, created_at: p.createdAt.toISOString(), updated_at: p.updatedAt.toISOString(), verified_at: p.verifiedAt ? p.verifiedAt.toISOString() : null, rejected_reason: p.rejectedReason ?? null };
  },
};
