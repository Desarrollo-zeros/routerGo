import type { ChatRun } from '../../../domain/entities/ChatRun';

export interface RunRepository {
  findById(id: string): Promise<ChatRun | null>;
  findByIdempotency(walletId: string, key: string): Promise<ChatRun | null>;
  createIfAbsent(run: ChatRun): Promise<boolean>;
  save(run: ChatRun): Promise<void>;
}
