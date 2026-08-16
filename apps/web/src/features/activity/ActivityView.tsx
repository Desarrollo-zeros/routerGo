import React, { useCallback } from "react";
import { SponsorPlacement } from "../../design-system/SponsorPlacement";
import type { HttpApiPort } from "../../runtime/ApiPort";
import { useActivityMachine } from "./useActivityMachine";
import { DEFAULT_EXERCISE, EXERCISES, loadExerciseDataset } from "./exerciseCatalog";

type ActivityMachine = ReturnType<typeof useActivityMachine>;

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
  const [exerciseId, setExerciseId] = React.useState(DEFAULT_EXERCISE.id);
  const [exercises, setExercises] = React.useState(EXERCISES);
  const [catalogStatus, setCatalogStatus] = React.useState("Catálogo local disponible");
  const [verified, setVerified] = React.useState<number | undefined>();
  const [balance, setBalance] = React.useState(0);
  React.useEffect(() => {
    void api.request<{ balance: number }>({ routeKey: "wallet-get" })
      .then((wallet) => setBalance(wallet.balance))
      .catch(() => undefined);
  }, [api]);
  React.useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    void loadExerciseDataset(controller.signal).then((items) => {
      const merged = [...EXERCISES, ...items.filter((item) => !EXERCISES.some((local) => local.name.toLowerCase() === item.name.toLowerCase()))];
      setExercises(merged);
      setExerciseId((current) => merged.some((item) => item.id === current) ? current : merged[0].id);
      setCatalogStatus(`${merged.length} ejercicios de peso corporal disponibles`);
    }).catch(() => setCatalogStatus("Catálogo local disponible · sin conexión")).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, []);
  const submit = useCallback(async () => {
    machine.submit();
    machine.verifying();
    try {
      const nonce = crypto.randomUUID();
      const result = await api.request<{ credits: string; newBalance: string }>({ routeKey: "activity-verify", params: { id: "current" }, body: { reps: machine.count, sessionId: "current", challenge_nonce: nonce, evidence_hash: String(machine.count) }, headers: { "idempotency-key": nonce } });
      setVerified(machine.count);
      setBalance(Number(result.newBalance));
      machine.setVerified();
    } catch (error) {
      machine.setRejected(error instanceof Error ? error.message : "No se pudo verificar la sesión.");
    }
  }, [api, machine]);
  const action = primaryAction(machine.state, machine, submit);
  const isCameraVisible = !["idle", "permission"].includes(machine.state);
  const shownReps = machine.state === "verified" ? verified ?? machine.count : machine.count;
  const exercise = exercises.find((item) => item.id === exerciseId) ?? DEFAULT_EXERCISE;

  return <div className="rg-activity-page">
    <section className="rg-activity-hero"><p>Tu esfuerzo te acerca a lo que quieres</p><h1>Recupera GoCredits<br /><span>con tu esfuerzo 💪</span></h1><p>Entrena, verifica tu esfuerzo y usa tus créditos al instante.</p><div className="rg-exercise-picker"><label htmlFor="exercise-select">Actividad actual</label><select id="exercise-select" value={exercise.id} onChange={(event) => setExerciseId(event.target.value)} disabled={machine.state !== "idle"}><option value="" disabled>Elige un ejercicio</option>{exercises.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.target}</option>)}</select><small>{catalogStatus}</small></div></section>
    <div className="rg-activity-layout"><div className="rg-activity-main"><section className="rg-exercise-card" aria-live="polite">
      <div className="rg-exercise-meta"><div><span className="rg-exercise-tag">♟ {exercise.category} · {exercise.level}</span><h2>{exercise.name}</h2><p>{exercise.target} · {exercise.equipment}</p></div><div className="rg-rep-ring">{shownReps}<small>reps</small></div></div>
      <div className="rg-exercise-visual"><img src={exercise.animationUrl ?? exercise.imageUrl ?? "/exercise-pushup.png"} onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = exercise.imageUrl ?? "/exercise-pushup.png"; }} alt={`Demostración de ${exercise.name.toLowerCase()}`} /></div>
      <div className="rg-exercise-details"><p>{exercise.instruction}</p><small>{exercise.muscles} · Catálogo: {exercise.source}</small></div>
      <div className="rg-credit-strip"><div className="rg-credit-token"><span>G</span></div><p>Cada repetición equivale a<strong>1 GoCredit</strong></p><span className="rg-credit-arrow">→</span><p>Úsalos al instante<span>sin esperar.</span></p></div>
      {machine.error ? <p className="rg-error-copy" role="alert">{machine.error}</p> : null}
    </section>
    <video ref={machine.videoRef} playsInline muted autoPlay className={isCameraVisible ? "rg-camera" : "rg-camera rg-camera-idle"} aria-label="Vista de cámara" />
    {action ? <button className="rg-workout-cta" onClick={action} disabled={machine.state === "loading_model" || machine.state === "verifying"}>{actionLabel(machine.state)}</button> : null}
    {machine.state !== "idle" ? <button className="rg-secondary-button" onClick={machine.reset}>Reiniciar sesión</button> : null}
    <p className="rg-privacy-note">La cámara se activa solo al comenzar. El video no se sube; solo enviamos evidencia cuantizada.</p></div><aside className="rg-activity-rail" aria-label="Resumen de actividad"><section className="rg-balance-feature"><div><span>GoCredits disponibles</span><strong>{balance.toLocaleString("es")}</strong><p>Equivalen a {balance.toLocaleString("es")} repeticiones</p><span className="rg-balance-ready">Listos para usar →</span></div><div className="rg-balance-art" aria-hidden="true"><span><em>G</em></span><i /><b /></div></section><SponsorPlacement placement="activity-inline" api={api} /><section className="rg-stats-card"><div><span>Actividad actual</span><strong>{shownReps}</strong><small>repeticiones</small></div><div><span>Catálogo</span><strong>{exercises.length}</strong><small>ejercicios disponibles</small></div><p>La sesión solo envía evidencia cuantizada; el video no se sube.</p></section></aside></div>
  </div>;
}
