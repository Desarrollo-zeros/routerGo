export interface GetWalletInput {
  userId: string;
  walletId: string;
}

export interface GetWalletOutput {
  walletId: string;
  balance: string;
  version: number;
}

export interface GetWalletPort {
  execute(input: GetWalletInput): Promise<GetWalletOutput>;
}
