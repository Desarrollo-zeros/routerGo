import React from "react";
import { CreditBalance } from "../../design-system/CreditBalance";
import { useWallet } from "./useWallet";

export function WalletView(): React.ReactElement {
  const { wallet, entries, loading, error, refresh } = useWallet();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <CreditBalance balance={wallet?.balance ?? 0} pending={undefined} />
      <p style={{ fontSize: 13, color: "#a1a1b5", margin: 0 }}>Total ganado: {(wallet?.lifetime_earned ?? 0).toLocaleString("es")} créditos · Moneda: {wallet?.currency ?? "CREDITS"}</p>
      {error ? <p role="alert" style={{ color: "#ff4d6a" }}>{error}</p> : null}
      <button onClick={() => void refresh()} disabled={loading} style={{ minHeight: 44, borderRadius: 12, border: "1px solid #232336", background: "#12121a", color: "#f2f2f7" }}>{loading ? "Cargando…" : "Actualizar"}</button>
      <h3 style={{ margin: "8px 0 0", fontSize: 14 }}>Historial</h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.length === 0 ? <li style={{ color: "#6b6b80", fontSize: 13 }}>Sin movimientos aún.</li> : null}
        {entries.map((e) => (
          <li key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#151520", borderRadius: 12, border: "1px solid #232336" }}>
            <span style={{ fontSize: 13 }}>{e.type}</span>
            <span style={{ fontWeight: 700, color: e.amount_signed > 0 ? "#2ecc71" : "#ff4d6a" }}>{e.amount_signed > 0 ? "+" : ""}{e.amount_signed}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
