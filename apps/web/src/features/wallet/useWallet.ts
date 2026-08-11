import { useCallback, useEffect, useState } from "react";
import { httpRequest } from "../../adapters/http";

export type Wallet = { balance: number; lifetime_earned: number; currency: string };
export type LedgerEntry = { id: string; type: string; amount_signed: number; created_at: string };

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const w = await httpRequest<Wallet>("/api/wallet");
      const l = await httpRequest<{ entries: LedgerEntry[] }>("/api/wallet/ledger");
      setWallet(w); setEntries(l.entries ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);
  return { wallet, entries, loading, error, refresh };
}
