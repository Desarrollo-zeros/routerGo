import type { GetWalletPort, GetWalletInput, GetWalletOutput } from '../ports/inbound/GetWalletPort';
import type { WalletRepository } from '../ports/outbound/WalletRepository';

export class GetWalletUseCase implements GetWalletPort {
  constructor(private readonly wallets: WalletRepository) {}
  async execute(input: GetWalletInput): Promise<GetWalletOutput> {
    if (!input.userId || !input.walletId) throw new Error('InvalidInput');
    const wallet = await this.wallets.findById(input.walletId);
    if (!wallet) throw new Error('WalletNotFound');
    if (wallet.userId !== input.userId) throw new Error('Forbidden');
    return { walletId: wallet.id, balance: wallet.balance.toString(), version: wallet.version };
  }
}
