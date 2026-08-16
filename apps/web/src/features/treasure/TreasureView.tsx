import React from "react";

export type TreasureHuntCard = {
  id: string;
  title: string;
  locationKind: string;
  stepCount: number;
  status: string;
};

type TreasureViewProps = {
  hunts: readonly TreasureHuntCard[];
  permission: "unknown" | "granted" | "denied";
  alternativeAvailable?: boolean;
  onChooseAlternative?: () => void;
};

export function TreasureView({ hunts, permission, alternativeAvailable = false, onChooseAlternative }: TreasureViewProps): React.ReactElement {
  return (
    <section className="rg-treasure" aria-labelledby="treasure-title">
      <h1 id="treasure-title">Treasure hunts</h1>
      <p className="rg-privacy-note">No guardamos tu ubicación exacta. Solo usamos una zona aproximada para verificar un paso.</p>
      {permission === "denied" ? <PermissionNotice alternativeAvailable={alternativeAvailable} onChooseAlternative={onChooseAlternative} /> : null}
      <div className="rg-treasure-layout">
        <CoarseMap count={hunts.length} />
        <HuntList hunts={hunts} />
      </div>
    </section>
  );
}

function PermissionNotice({ alternativeAvailable, onChooseAlternative }: Pick<TreasureViewProps, "alternativeAvailable" | "onChooseAlternative">): React.ReactElement {
  return (
    <div className="rg-treasure-notice" role="status">
      <p>La ubicación está desactivada para este dispositivo.</p>
      {alternativeAvailable && onChooseAlternative ? <button className="rg-secondary-button" onClick={onChooseAlternative}>Continuar sin ubicación</button> : <p>Este hunt no tiene una alternativa disponible.</p>}
    </div>
  );
}

function CoarseMap({ count }: { count: number }): React.ReactElement {
  return (
    <div className="rg-treasure-map" role="region" aria-label="Mapa de zonas aproximadas">
      <h2>Mapa de zonas aproximadas</h2>
      <p className="rg-secondary-copy">Las zonas se muestran de forma general para proteger la privacidad.</p>
      <div className="rg-treasure-map-grid" aria-hidden="true">
        {Array.from({ length: Math.max(count, 1) }, (_, index) => <span key={index} className="rg-treasure-marker" />)}
      </div>
    </div>
  );
}

function HuntList({ hunts }: { hunts: readonly TreasureHuntCard[] }): React.ReactElement {
  return (
    <div className="rg-treasure-list" aria-labelledby="treasure-list-title">
      <h2 id="treasure-list-title">Available hunts</h2>
      {hunts.length === 0 ? <p className="rg-muted-copy">No hay hunts disponibles.</p> : <ul className="rg-entry-list">{hunts.map((hunt) => <HuntItem key={hunt.id} hunt={hunt} />)}</ul>}
    </div>
  );
}

function HuntItem({ hunt }: { hunt: TreasureHuntCard }): React.ReactElement {
  return <li className="rg-treasure-item"><div><h3>{hunt.title}</h3><p className="rg-secondary-copy">{hunt.locationKind} · {hunt.stepCount} pasos</p></div><span className="rg-treasure-status">{hunt.status}</span></li>;
}
