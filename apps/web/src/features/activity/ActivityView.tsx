import React, { useCallback } from "react";
import { ActivityCard } from "../../design-system/ActivityCard";
import { PrimaryCTA } from "../../design-system/PrimaryCTA";
import { SponsorPlacement } from "../../design-system/SponsorPlacement";
import { useActivityMachine } from "./useActivityMachine";
import { httpRequest } from "../../adapters/http";

type ActivityMachine = ReturnType<typeof useActivityMachine>;

function getCtaLabel(state: string): string | undefined {
  if (state === "idle") return "Comenzar";
  if (state === "permission") return "Permitir cámara";
  if (state === "ready") return "Iniciar";
  if (state === "active") return "Enviar verificación";
  if (state === "paused") return "Reanudar";
  return undefined;
}

function getPrimaryAction(state: string, m: ActivityMachine, doSubmit: () => void): (() => void) | undefined {
  if (state === "idle" || state === "rejected" || state === "unavailable") return m.startPermission;
  if (state === "permission") return m.startPermission;
  if (state === "ready") return m.startActive;
  if (state === "active") return doSubmit;
  if (state === "paused") return m.resume;
  return undefined;
}

function getSecondaryConfig(state: string, m: ActivityMachine): { action?: () => void; label?: string } {
  if (state === "active") return { action: m.pause, label: "Pausar" };
  if (state === "paused") return { action: m.reset, label: "Reiniciar" };
  return {};
}

function buildVerifyBody(count: number): Record<string, unknown> {
  return { claimed_reps: count, challenge_nonce: crypto.randomUUID(), evidence_hash: String(count) };
}

function getVideoDisplay(state: string): string {
  if (state === "idle" || state === "permission") return "none";
  return "block";
}

export function ActivityView(): React.ReactElement {
  const m = useActivityMachine();
  const [verified, setVerified] = React.useState<number | undefined>();
  const [credits, setCredits] = React.useState<number | undefined>();

  const doSubmit = useCallback(async () => {
    m.submit();
    m.verifying();
    try {
      const res = await httpRequest<{ verified_reps: number; credits: number }>("/api/activity/verify", {
        method: "POST",
        body: buildVerifyBody(m.count),
      });
      setVerified(res.verified_reps);
      setCredits(res.credits);
      m.setVerified();
    } catch (e) {
      m.setRejected(e instanceof Error ? e.message : "Rechazado");
    }
  }, [m]);

  const label = getCtaLabel(m.state);
  const action = getPrimaryAction(m.state, m, doSubmit);
  const secondary = getSecondaryConfig(m.state, m);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <ActivityCard state={m.state} count={m.count} verifiedReps={verified} credits={credits} error={m.error} onAction={action} actionLabel={label} secondaryAction={secondary.action} secondaryLabel={secondary.label} />
      <div style={{ position: "relative", background: "#0f0f18", borderRadius: 16, overflow: "hidden", minHeight: 220, display: getVideoDisplay(m.state) }}>
        <video ref={m.videoRef} playsInline muted autoPlay style={{ width: "100%", height: 320, objectFit: "cover", objectPosition: "center" }} aria-label="Vista de cámara" />
      </div>
      {m.state !== "idle" ? <PrimaryCTA onClick={m.reset}>Reiniciar</PrimaryCTA> : null}
      <SponsorPlacement placement="activity-inline" />
      <p style={{ fontSize: 12, color: "#6b6b80", margin: 0 }}>Privacidad: el video no se sube. Solo se envía evidencia cuantizada. Detén la cámara al salir.</p>
    </div>
  );
}
