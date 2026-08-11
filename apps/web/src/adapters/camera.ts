export type CameraState = "idle" | "granted" | "denied" | "unavailable";

export async function requestCamera(videoEl: HTMLVideoElement, constraints: MediaStreamConstraints = { video: { facingMode: "user" }, audio: false }): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia no disponible");
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  videoEl.srcObject = stream;
  await videoEl.play().catch(() => {});
  return stream;
}

export function stopStream(stream: MediaStream | null): void {
  if (!stream) return;
  for (const t of stream.getTracks()) t.stop();
}

export function isCameraDenied(err: unknown): boolean {
  const e = err as { name?: string };
  return e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError";
}

export function attachVisibilityStop(stream: MediaStream, onHide: () => void): () => void {
  const handler = () => {
    if (document.hidden) onHide();
  };
  document.addEventListener("visibilitychange", handler);
  return () => document.removeEventListener("visibilitychange", handler);
}
