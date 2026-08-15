import React from "react";
import { CreditBalance } from "../../design-system/CreditBalance";
import type { HttpApiPort } from "../../runtime/ApiPort";
import { useWallet } from "./useWallet";

export function WalletView({ api }: { api: HttpApiPort }): React.ReactElement {
  const { wallet, entries, loading, error, refresh } = useWallet(api);
  return (
    <div className="rg-feature-stack">
      <CreditBalance balance={wallet?.balance ?? 0} pending={undefined} />
      <p className="rg-secondary-copy">Total ganado: {(wallet?.lifetime_earned ?? 0).toLocaleString("es")} créditos · Moneda: {wallet?.currency ?? "CREDITS"}</p>
      {error ? <p role="alert" className="rg-error-copy">{error}</p> : null}
      <button onClick={() => void refresh()} disabled={loading} className="rg-secondary-button">{loading ? "Cargando…" : "Actualizar"}</button>
      <h3 className="rg-section-heading">Historial</h3>
      <ul className="rg-entry-list">
        {entries.length === 0 ? <li className="rg-muted-copy">Sin movimientos aún.</li> : null}
        {entries.map((e) => (
          <li key={e.id} className="rg-entry">
            <span>{e.type}</span>
            <span className={e.amount_signed > 0 ? "rg-positive" : "rg-negative"}>{e.amount_signed > 0 ? "+" : ""}{e.amount_signed}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
