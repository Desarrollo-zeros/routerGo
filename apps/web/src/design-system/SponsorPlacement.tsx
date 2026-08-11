import React from "react";

type Props = {
  placement: string;
  onClose?: () => void;
  children?: React.ReactNode;
};

export function SponsorPlacement({ placement, onClose, children }: Props): React.ReactElement {
  return (
    <aside className="rg-sponsor" aria-label="Patrocinado">
      <div className="rg-sponsor-head">
        <span className="rg-sponsor-badge">Patrocinado</span>
        {onClose ? (
          <button className="rg-sponsor-close" onClick={onClose} aria-label="Cerrar patrocinado">
            ×
          </button>
        ) : null}
      </div>
      <div className="rg-sponsor-body" data-placement={placement}>
        {children ?? <span className="rg-sponsor-empty">Espacio patrocinado — sin fill</span>}
      </div>
      <style>{css}</style>
    </aside>
  );
}

const css = `
.rg-sponsor{border:1px solid #2a2a3a;border-radius:12px;padding:10px 12px;background:#151520;min-height:72px}
.rg-sponsor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.rg-sponsor-badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#a1a1b5;border:1px solid #2a2a3a;padding:2px 6px;border-radius:999px}
.rg-sponsor-close{width:44px;height:44px;border-radius:999px;border:1px solid #333;background:transparent;color:#a1a1b5;cursor:pointer}
.rg-sponsor-close:focus-visible{outline:2px solid #7c5cff;outline-offset:2px}
.rg-sponsor-empty{font-size:13px;color:#6b6b80}
.rg-sponsor-body{min-height:32px}
`;
