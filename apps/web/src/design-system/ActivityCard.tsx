import React from "react";

export type ActivityState =
  | "idle"
  | "permission"
  | "loading_model"
  | "calibration"
  | "ready"
  | "active"
  | "paused"
  | "submitted"
  | "verifying"
  | "verified"
  | "rejected"
  | "unavailable";

type Props = {
  state: ActivityState;
  count?: number;
  verifiedReps?: number;
  credits?: number;
  error?: string;
  onAction?: () => void;
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
};

const copy: Record<ActivityState, { title: string; desc: string }> = {
  idle: { title: "Flexiones verificadas", desc: "Gana créditos con esfuerzo real. La cámara solo se activa si tú lo pides." },
  permission: { title: "Permiso de cámara", desc: "Necesitamos cámara para contar. Tu video no se sube. Puedes usar FREE sin cámara." },
  loading_model: { title: "Cargando detector", desc: "Preparando modelo local… no prometemos duración exacta." },
  calibration: { title: "Calibración", desc: "Colócate de lado, encuadra hombros y cadera, buena luz. Aún no contamos." },
  ready: { title: "Listo para iniciar", desc: "Condiciones válidas. Pulsa iniciar cuando quieras." },
  active: { title: "En actividad", desc: "Contador provisional hasta verificación del servidor." },
  paused: { title: "Pausado", desc: "Puedes reanudar o finalizar sin perder el progreso provisional." },
  submitted: { title: "Enviado", desc: "Evidencia enviada. No modifiques el contador, el servidor decide." },
  verifying: { title: "Verificando", desc: "El servidor valida calidad, rango y secuencia." },
  verified: { title: "Verificado", desc: "Repeticiones aceptadas y créditos acreditados." },
  rejected: { title: "No verificado", desc: "No se pudo validar. Puedes reintentar; no prometemos crédito." },
  unavailable: { title: "No disponible", desc: "Cámara, modelo o cuota no disponible. Prueba FREE o reintenta." },
};

function isBusy(state: ActivityState): boolean {
  return state === "verifying" || state === "loading_model";
}

function getDisplayCount(state: ActivityState, count: number, verifiedReps?: number): number {
  if (state === "verified") return verifiedReps ?? count;
  return count;
}

function getSuffix(state: ActivityState): string {
  if (state === "active") return "reps · provisional";
  return "reps";
}

function shouldShowCredits(state: ActivityState, credits?: number): boolean {
  return state === "verified" && credits !== undefined;
}

export function ActivityCard({ state, count = 0, verifiedReps, credits, error, onAction, actionLabel, secondaryAction, secondaryLabel }: Props): React.ReactElement {
  const c = copy[state];
  const displayCount = getDisplayCount(state, count, verifiedReps);
  return (
    <section className="rg-activity" aria-live="polite" aria-busy={isBusy(state)}>
      <h2 className="rg-activity-title">{c.title}</h2>
      <p className="rg-activity-desc">{c.desc}</p>
      <div className="rg-activity-counter" role="status" aria-label={`Repeticiones ${displayCount}`}>
        <span className="rg-activity-count">{displayCount}</span>
        <span className="rg-activity-suffix">{getSuffix(state)}</span>
      </div>
      {shouldShowCredits(state, credits) ? <p className="rg-activity-credits">+{credits} créditos acreditados</p> : null}
      {error ? <p role="alert" className="rg-activity-error">{error}</p> : null}
      <div className="rg-activity-actions">
        {onAction && actionLabel ? <button className="rg-activity-cta" onClick={onAction}>{actionLabel}</button> : null}
        {secondaryAction && secondaryLabel ? <button className="rg-activity-sec" onClick={secondaryAction}>{secondaryLabel}</button> : null}
      </div>
      <style>{css}</style>
    </section>
  );
}

const css = `
.rg-activity{border:1px solid var(--rg-color-surface-muted,ButtonFace);background:var(--rg-color-surface,Canvas);border-radius:var(--rg-radius-md,12px);padding:16px;display:flex;flex-direction:column;gap:10px}
.rg-activity-title{font-size:18px;font-weight:700;margin:0}
.rg-activity-desc{font-size:14px;color:var(--rg-color-text-secondary,CanvasText);margin:0}
.rg-activity-counter{display:flex;align-items:baseline;gap:8px;padding:8px 12px;background:var(--rg-color-bg,Canvas);border-radius:var(--rg-radius-md,12px);min-height:44px}
.rg-activity-count{font-size:32px;font-weight:800;font-variant-numeric:tabular-nums}
.rg-activity-suffix{font-size:13px;color:var(--rg-color-text-secondary,CanvasText)}
.rg-activity-credits{color:var(--rg-color-success,CanvasText);font-weight:600;margin:0}
.rg-activity-error{color:var(--rg-color-danger,CanvasText);font-size:13px;margin:0}
.rg-activity-actions{display:flex;gap:8px;flex-wrap:wrap}
.rg-activity-cta{min-height:44px;padding:10px 18px;border-radius:999px;border:0;background:var(--rg-color-brand,ButtonFace);color:var(--rg-color-text-primary,CanvasText);font-weight:700;cursor:pointer}
.rg-activity-cta:focus-visible{outline:2px solid var(--rg-color-brand-soft,Highlight);outline-offset:2px}
.rg-activity-sec{min-height:44px;padding:10px 16px;border-radius:999px;border:1px solid var(--rg-color-surface-muted,ButtonFace);background:transparent;color:var(--rg-color-text-primary,CanvasText);cursor:pointer}
`;
