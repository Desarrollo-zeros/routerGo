import React, { useCallback } from "react";
import { SponsorPlacement } from "../../design-system/SponsorPlacement";
import type { HttpApiPort } from "../../runtime/ApiPort";
import { useActivityMachine } from "./useActivityMachine";

type ActivityMachine = ReturnType<typeof useActivityMachine>;

function buildVerifyBody(count: number): Record<string, unknown> {
  return { claimed_reps: count, challenge_nonce: crypto.randomUUID(), evidence_hash: String(count) };
}

function primaryAction(state: string, machine: ActivityMachine, submit: () => void): (() => void) | undefined {
  if (["idle", "rejected", "unavailable", "permission"].includes(state)) return machine.startPermission;
  if (state === "ready") return machine.startActive;
  if (state === "active") return submit;
  if (state === "paused") return machine.resume;
  return undefined;
}

function actionLabel(state: string): string {
  if (state === "active") return "Enviar verificación";
  if (state === "ready") return "Iniciar entrenamiento";
  if (state === "paused") return "Reanudar";
  if (state === "permission") return "Permitir cámara";
  return "Comenzar entrenamiento";
}

export function ActivityView({ api }: { api: HttpApiPort }): React.ReactElement {
  const machine = useActivityMachine();
  const [verified, setVerified] = React.useState<number | undefined>();
  const [balance, setBalance] = React.useState(0);
  React.useEffect(() => {
    void api.request<{ balance: number }>({ routeKey: "wallet-get" })
      .then((wallet) => setBalance(wallet.balance))
      .catch(() => undefined);
  }, [api]);
  const submit = useCallback(async () => {
    machine.submit();
    machine.verifying();
    try {
      const result = await api.request<{ verified_reps: number; credits: number }>({ routeKey: "activity-verify", params: { id: "current" }, body: buildVerifyBody(machine.count) });
      setVerified(result.verified_reps);
      machine.setVerified();
    } catch (error) {
      machine.setRejected(error instanceof Error ? error.message : "No se pudo verificar la sesión.");
    }
  }, [api, machine]);
  const action = primaryAction(machine.state, machine, submit);
  const isCameraVisible = !["idle", "permission"].includes(machine.state);
  const shownReps = machine.state === "verified" ? verified ?? machine.count : machine.count;

  return <div className="rg-activity-page">
    <section className="rg-activity-hero"><p>Una forma distinta de acceder</p><h1>Recupera GoCredits<br /><span>con tu esfuerzo 💪</span></h1><p>Entrena, verifica tu esfuerzo y usa tus créditos al instante.</p></section>
    <section className="rg-exercise-card" aria-live="polite">
      <div className="rg-exercise-meta"><div><span className="rg-exercise-tag">♟ Ejercicio actual</span><h2>Flexiones</h2><p>Ejercicio corporal</p></div><div className="rg-rep-ring">{shownReps}<small>reps</small></div></div>
      <div className="rg-exercise-visual" role="img" aria-label="Ilustración de una persona haciendo flexiones"><div className="rg-athlete" /></div>
      <div className="rg-credit-strip"><div className="rg-credit-token"><span>G</span></div><p>Cada flexión equivale a<strong>1 GoCredit</strong></p><span className="rg-credit-arrow">→</span><p>Úsalos al instante<br />sin esperar.</p></div>
      {machine.error ? <p className="rg-error-copy" role="alert">{machine.error}</p> : null}
    </section>
    <SponsorPlacement placement="activity-inline"><div className="rg-sponsor-content"><span>Patrocinado</span><strong>Tu esfuerzo merece impulso.</strong><small>Descubre una oferta que acompaña tu entrenamiento.</small></div></SponsorPlacement>
    <section className="rg-reward-card"><div><p>GoCredits disponibles</p><strong>{balance}</strong></div><span className="rg-reward-action">Listos para usar</span></section>
    {isCameraVisible ? <video ref={machine.videoRef} playsInline muted autoPlay className="rg-camera" aria-label="Vista de cámara" /> : null}
    {action ? <button className="rg-workout-cta" onClick={action} disabled={machine.state === "loading_model" || machine.state === "verifying"}>{actionLabel(machine.state)}</button> : null}
    {machine.state !== "idle" ? <button className="rg-secondary-button" onClick={machine.reset}>Reiniciar sesión</button> : null}
    <p className="rg-privacy-note">La cámara se activa solo al comenzar. El video no se sube; solo enviamos evidencia cuantizada.</p>
  </div>;
}
