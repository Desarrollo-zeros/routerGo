import React from "react";

type BattleViewProps = { authenticated?: boolean };

export function BattleView({ authenticated = false }: BattleViewProps): React.ReactElement {
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
        <button className="rg-battle-cta" type="button" disabled={!authenticated} aria-describedby="battle-status">
          {authenticated ? "Buscar partida" : "Inicia sesión para jugar"}
        </button>
        <p id="battle-status" className="rg-muted-copy" role="status">
          {authenticated ? "La conexión segura estará disponible cuando el servicio de partidas esté listo." : "La partida requiere una sesión autenticada."}
        </p>
      </div>
    </section>
  );
}
