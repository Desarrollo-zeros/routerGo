import type { ChatRun } from '../../../domain/entities/ChatRun';

export interface RunRepository {
  findById(id: string): Promise<ChatRun | null>;
  findByIdempotency(walletId: string, key: string): Promise<ChatRun | null>;
  save(run: ChatRun): Promise<void>;
}
