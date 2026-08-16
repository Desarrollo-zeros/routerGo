export type WalletLedgerRow = { id: string; type: string; amount_signed: string; created_at: string };

export interface WalletLedgerReader {
  listByWallet(walletId: string, limit: number): Promise<WalletLedgerRow[]>;
}
