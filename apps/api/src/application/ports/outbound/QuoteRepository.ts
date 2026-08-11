import type { ChatQuote } from '../../../domain/entities/ChatQuote';

export interface QuoteRepository {
  findById(id: string): Promise<ChatQuote | null>;
  findByIdempotency(walletId: string, key: string): Promise<ChatQuote | null>;
  save(quote: ChatQuote): Promise<void>;
}
