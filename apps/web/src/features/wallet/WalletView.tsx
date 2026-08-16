import React from "react";
import { CreditBalance } from "../../design-system/CreditBalance";
import type { HttpApiPort } from "../../runtime/ApiPort";
import { useWallet } from "./useWallet";

export function WalletView({ api }: { api: HttpApiPort }): React.ReactElement {
  const { wallet, entries, loading, error, refresh } = useWallet(api);
  const balance = wallet?.balance ?? 0;
  const lifetime = wallet?.lifetime_earned ?? 0;
  return (
    <div className="rg-wallet-page">
      <section className="rg-wallet-hero"><p className="rg-wallet-kicker">Tu economía RouterGo</p><h1>Tu saldo, listo para usar.</h1><p>Convierte tu esfuerzo en conversaciones, herramientas y acceso sin perder el control.</p></section>
      <section className="rg-wallet-balance-card"><div className="rg-wallet-token">G</div><div><p>GoCredits disponibles</p><strong>{balance.toLocaleString("es")}</strong><span>{wallet?.currency ?? "CREDITS"} · saldo actual</span></div><CreditBalance balance={balance} label="Disponible" /></section>
      <div className="rg-wallet-stats"><div><span>Ganados hasta hoy</span><strong>{lifetime.toLocaleString("es")}</strong><small>GoCredits</small></div><div><span>Movimientos</span><strong>{entries.length}</strong><small>registrados</small></div></div>
      {error ? <section className="rg-wallet-notice" role="alert"><strong>Conecta tu cuenta para ver el saldo real.</strong><p>La sesión visual está activa, pero el servicio de wallet requiere una identidad HTTP.</p><button onClick={() => void refresh()} disabled={loading}>{loading ? "Actualizando…" : "Intentar de nuevo"}</button></section> : null}
      <section className="rg-wallet-history"><div className="rg-wallet-section-head"><div><p className="rg-wallet-kicker">Actividad de saldo</p><h2>Historial</h2></div><button onClick={() => void refresh()} disabled={loading} aria-label="Actualizar historial">↻</button></div><ul className="rg-entry-list">{entries.length === 0 ? <li className="rg-wallet-empty"><span className="rg-empty-icon">✦</span><div><strong>Aún no hay movimientos</strong><p>Cuando ganes o uses GoCredits, aparecerán aquí.</p></div></li> : null}{entries.map((e) => <li key={e.id} className="rg-entry"><span>{e.type}</span><span className={e.amount_signed > 0 ? "rg-positive" : "rg-negative"}>{e.amount_signed > 0 ? "+" : ""}{e.amount_signed}</span></li>)}</ul></section>
    </div>
  );
}
