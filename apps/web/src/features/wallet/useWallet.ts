import { useCallback, useEffect, useState } from "react";
import type { HttpApiPort } from "../../runtime/ApiPort";

export type Wallet = { balance: number; lifetime_earned: number; currency: string };
export type LedgerEntry = { id: string; type: string; amount_signed: number; created_at: string };

export function useWallet(api: HttpApiPort) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const w = await api.request<Wallet>({ routeKey: "wallet-get" });
      const l = await api.request<{ entries: LedgerEntry[] }>({ routeKey: "wallet-ledger" });
      const normalized = { ...w, balance: Number(w.balance), lifetime_earned: Number(w.lifetime_earned ?? 0), currency: w.currency ?? "CREDITS" };
      const normalizedEntries = (l.entries ?? []).map((entry) => ({ ...entry, amount_signed: Number(entry.amount_signed) }));
      setWallet(normalized); setEntries(normalizedEntries);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    setLoading(false);
  }, [api]);

  useEffect(() => { void refresh(); }, [refresh]);
  return { wallet, entries, loading, error, refresh };
}
