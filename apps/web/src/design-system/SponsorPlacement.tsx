import React from "react";
import type { HttpApiPort } from "../runtime/ApiPort";

type Props = {
  placement: string;
  onClose?: () => void;
  children?: React.ReactNode;
  api?: HttpApiPort;
};

type PublicAd = { outcome: "SELECTED" | "NO_FILL"; sponsoredLabel?: string; title?: string; body?: string; imageUrl?: string; clickUrl?: string };

export function SponsorPlacement({ placement, onClose, children, api }: Props): React.ReactElement {
  const [ad, setAd] = React.useState<PublicAd | null>(null);
  const [status, setStatus] = React.useState<"loading" | "ready" | "empty" | "error">(api ? "loading" : "ready");
  React.useEffect(() => {
    if (!api) return;
    const controller = new AbortController();
    void api.request<PublicAd>({ routeKey: "public-ad-decision", query: { placement }, signal: controller.signal })
      .then((result) => { setAd(result); setStatus(result.outcome === "SELECTED" ? "ready" : "empty"); })
      .catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [api, placement]);
  const content = children && !api ? children : ad?.outcome === "SELECTED" ? <AdContent ad={ad} /> : null;
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
        {status === "loading" ? <span className="rg-sponsor-empty">Buscando una campaña…</span> : null}
        {status === "error" ? <span className="rg-sponsor-empty">No se pudo cargar el patrocinio.</span> : null}
        {status === "empty" ? <span className="rg-sponsor-empty">No hay una campaña disponible.</span> : null}
        {content}
      </div>
      <style>{css}</style>
    </aside>
  );
}

function AdContent({ ad }: { ad: PublicAd }): React.ReactElement {
  const body = <><span>{ad.sponsoredLabel ?? "Patrocinado"}</span><strong>{ad.title ?? "Contenido patrocinado"}</strong>{ad.body ? <small>{ad.body}</small> : null}</>;
  return ad.clickUrl ? <a className="rg-sponsor-link" href={ad.clickUrl}>{ad.imageUrl ? <img src={ad.imageUrl} alt="" /> : null}<span className="rg-sponsor-copy">{body}</span></a> : <div className="rg-sponsor-link">{ad.imageUrl ? <img src={ad.imageUrl} alt="" /> : null}<span className="rg-sponsor-copy">{body}</span></div>;
}

const css = `
.rg-sponsor{border:1px solid var(--rg-color-surface-muted,ButtonFace);border-radius:var(--rg-radius-md,12px);padding:10px 12px;background:var(--rg-color-surface,Canvas);min-height:72px}
.rg-sponsor-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}
.rg-sponsor-badge{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--rg-color-text-secondary,CanvasText);border:1px solid var(--rg-color-surface-muted,ButtonFace);padding:2px 6px;border-radius:999px}
.rg-sponsor-close{width:44px;height:44px;border-radius:999px;border:1px solid var(--rg-color-surface-muted,ButtonFace);background:transparent;color:var(--rg-color-text-secondary,CanvasText);cursor:pointer}
.rg-sponsor-close:focus-visible{outline:2px solid var(--rg-color-brand,Highlight);outline-offset:2px}
.rg-sponsor-empty{font-size:13px;color:var(--rg-color-text-disabled,CanvasText)}
.rg-sponsor-body{min-height:32px}
.rg-sponsor-link{display:flex;align-items:center;gap:12px;color:inherit;text-decoration:none}.rg-sponsor-link img{width:64px;height:42px;object-fit:cover;border-radius:8px}.rg-sponsor-copy{display:grid;gap:3px}.rg-sponsor-copy span{font-size:10px;color:var(--rg-color-brand-soft,#a29bfe);text-transform:uppercase;letter-spacing:.08em}.rg-sponsor-copy strong{font-size:15px}.rg-sponsor-copy small{color:var(--rg-color-text-secondary,#a0a0b8);font-size:12px}
`;
