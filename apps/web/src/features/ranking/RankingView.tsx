import React from "react";
import type { HttpApiPort } from "../../runtime/ApiPort";

type Entry = { position: number; handle: string; credits: string };

export function RankingView({ api }: { api: HttpApiPort }): React.ReactElement {
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  React.useEffect(() => { void api.request<Entry[]>({ routeKey: "leaderboard-list" }).then((items) => { setEntries(items); setState("ready"); }).catch(() => setState("error")); }, [api]);
  return <main className="rg-ranking-page"><header className="rg-ranking-hero"><p className="rg-wallet-kicker">Liga RouterGo</p><h1>Tu progreso<br /><span>se ve.</span></h1><p>Una clasificación transparente basada en GoCredits ganados. Tu correo nunca se muestra completo.</p></header><section className="rg-ranking-card" aria-live="polite"><div className="rg-ranking-card-head"><div><span>Top users</span><h2>Esta temporada</h2></div><strong>GoCredits</strong></div>{state === "loading" ? <p className="rg-muted-copy">Calculando posiciones…</p> : null}{state === "error" ? <p className="rg-error-copy">No pudimos cargar la clasificación.</p> : null}{state === "ready" && entries.length === 0 ? <EmptyRanking /> : null}{entries.map((entry) => <div className="rg-ranking-row" key={`${entry.position}-${entry.handle}`}><span className="rg-ranking-position">{String(entry.position).padStart(2, "0")}</span><strong>{entry.handle}</strong><b>{entry.credits}</b></div>)}</section></main>;
}

function EmptyRanking(): React.ReactElement { return <div className="rg-ranking-empty"><span>✦</span><div><h2>Aún no hay posiciones</h2><p>Completa una actividad para comenzar tu recorrido.</p></div></div>; }
