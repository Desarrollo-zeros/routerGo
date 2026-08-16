import React from "react";
import type { HttpApiPort } from "../../runtime/ApiPort";

type BattleViewProps = { authenticated?: boolean; api?: HttpApiPort };
type BattleState = { id: string; status: string; maxPlayers?: number; players: readonly { userId: string; score: number }[]; currentRound: number };

export function BattleView({ authenticated = false, api }: BattleViewProps): React.ReactElement {
  const [state, setState] = React.useState<BattleState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  async function findMatch(): Promise<void> {
    if (!authenticated || !api || connecting) return;
    setConnecting(true); setError(null);
    try {
      const battle = await api.request<BattleState>({ routeKey: "battle-create", body: { category: "learning", maxPlayers: 2 } });
      setState(battle);
    } catch { setError("No se pudo crear la sala de Battles."); }
    finally { setConnecting(false); }
  }

  return (
    <section className="rg-battle" aria-labelledby="battle-title">
      <header className="rg-battle-heading">
        <div><p className="rg-secondary-label">RouterGo Battles</p><h1 id="battle-title">Juega en tiempo real</h1></div>
        <span className="rg-battle-badge" role="status">Sin apuestas</span>
      </header>
      <div className="rg-battle-card">
        <h2>Partidas de conocimiento</h2>
        <p className="rg-secondary-copy">Compite con puntuación validada por el servidor. Tus GoCredits nunca se ponen en juego.</p>
        <ul className="rg-battle-rules">
          <li>Rondas con tiempo limitado</li>
          <li>Puntuación calculada por respuestas correctas</li>
          <li>Recompensas sujetas a límites diarios</li>
        </ul>
        <button className="rg-battle-cta" type="button" disabled={!authenticated || !api || connecting} onClick={() => void findMatch()} aria-describedby="battle-status">
          {!authenticated ? "Inicia sesión para jugar" : connecting ? "Conectando…" : state ? "Partida creada" : "Buscar partida"}
        </button>
        <p id="battle-status" className="rg-muted-copy" role="status">
          {!authenticated ? "La partida requiere una sesión autenticada." : state ? `Sala ${state.id} · ${state.players.length}/${state.maxPlayers ?? 2} jugadores · ${state.status}` : error ?? "Crea una sala real y espera a otro jugador."}
        </p>
        {state ? <p className="rg-battle-live" role="status">Ronda {state.currentRound} · estado sincronizado en Redis</p> : null}
      </div>
    </section>
  );
}
