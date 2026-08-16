import React from "react";
import type { CatalogEntry } from "../../runtime/types";

type Props = { entries: CatalogEntry[] };

function tierLabel(tier: string): string {
  if (tier === "FREE") return "Gratis";
  if (tier === "PREMIUM") return "Premium";
  return "Estándar";
}

export function CatalogView({ entries }: Props): React.ReactElement {
  return (
    <div className="rg-catalog-page">
      <section className="rg-catalog-hero"><p className="rg-wallet-kicker">Catálogo RouterGo</p><h1>Elige tu forma de pensar.</h1><p>Modelos configurados por el runtime, con costo visible antes de cada solicitud.</p></section>
      <section className="rg-catalog-summary"><div><span>Modelos disponibles</span><strong>{entries.length}</strong></div><div><span>Acceso desde</span><strong>0 cr</strong></div><div><span>Contexto máximo</span><strong>{formatContext(entries)}</strong></div></section>
      <section className="rg-catalog-grid" aria-label="Modelos disponibles">
        {entries.map((entry) => <article className="rg-model-card" key={entry.logical_id}><div className="rg-model-card-head"><span className={`rg-model-orb rg-model-${entry.tier.toLowerCase()}`}>✦</span><span className="rg-model-tier">{tierLabel(entry.tier)}</span></div><h2>{entry.logical_id}</h2><p>{entry.tier === "FREE" ? "Ideal para empezar y probar ideas." : "Más capacidad para tareas exigentes."}</p><div className="rg-model-meta"><span>{formatContextValue(contextOf(entry))} contexto</span><strong>{entry.credit_price === 0 ? "Gratis" : `${entry.credit_price} cr`}</strong></div></article>)}
      </section>
      <p className="rg-catalog-note">El precio final se confirma antes de enviar. GoCredits son saldo interno y no equivalen a dinero.</p>
    </div>
  );
}

function formatContext(entries: CatalogEntry[]): string {
  const max = Math.max(...entries.map(contextOf), 0);
  return formatContextValue(max);
}

function contextOf(entry: CatalogEntry): number {
  const value = entry.capabilities.context;
  return typeof value === "number" ? value : 0;
}

function formatContextValue(value: number): string {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}
