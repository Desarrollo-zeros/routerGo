import { useCallback, useEffect, useRef, useState } from "react";
import type { ActivityState } from "../../design-system/ActivityCard";
import { requestCamera, stopStream } from "../../adapters/camera";
import { createPoseWorker } from "./poseWorker";
import { angleAt, classifyRep, smoothAngle } from "./hysteresis";
import { calibrate } from "./calibration";

type Landmark = { x: number; y: number; visibility?: number };
type RepState = "up" | "down";

function resolvePermissionError(msg: string): ActivityState {
  const low = msg.toLowerCase();
  if (low.includes("permission") || low.includes("denied")) return "permission";
  return "unavailable";
}

function waitForWorkerReady(worker: Worker): Promise<void> {
  return new Promise<void>((res, rej) => {
    const t = setTimeout(() => rej(new Error("timeout modelo")), 15000);
    worker.onmessage = (e) => {
      if (e.data.type === "ready") { clearTimeout(t); res(); }
      if (e.data.type === "error") { clearTimeout(t); rej(new Error(e.data.payload)); }
    };
    worker.postMessage({ type: "init" });
  });
}

async function requestFrame(worker: Worker, bitmap: ImageBitmap, ts: number): Promise<{ landmarks: Landmark[] | null }> {
  return new Promise<{ landmarks: Landmark[] | null }>((resolve) => {
    const handler = (e: MessageEvent) => {
      if (e.data.type === "result") { worker.removeEventListener("message", handler); resolve(e.data.payload); }
    };
    worker.addEventListener("message", handler);
    worker.postMessage({ type: "frame", payload: { bitmap, ts } }, [bitmap as unknown as Transferable]);
    setTimeout(() => { worker.removeEventListener("message", handler); resolve({ landmarks: null }); }, 400);
  });
}

function extractJoints(lm: Landmark[]): { shoulder: Landmark; elbow: Landmark; wrist: Landmark; hip: Landmark | undefined } | null {
  const shoulder = lm[11] ?? lm[12];
  const elbow = lm[13] ?? lm[14];
  const wrist = lm[15] ?? lm[16];
  const hip = lm[23] ?? lm[24];
  if (!shoulder || !elbow || !wrist) return null;
  return { shoulder, elbow, wrist, hip };
}

function updateCalibration(calibYs: { sy: number[]; hy: number[] }, shoulder: Landmark, hip: Landmark | undefined): void {
  calibYs.sy.push(shoulder.y);
  calibYs.hy.push(hip?.y ?? shoulder.y + 0.2);
  if (calibYs.sy.length > 30) { calibYs.sy.shift(); calibYs.hy.shift(); }
}

type RepInput = { shoulder: Landmark; elbow: Landmark; wrist: Landmark };
type RepContext = { smoothRef: React.MutableRefObject<number>; repState: React.MutableRefObject<RepState> };

function processRep(ctx: RepContext, joints: RepInput): boolean {
  const ang = angleAt(joints.shoulder, joints.elbow, joints.wrist);
  ctx.smoothRef.current = smoothAngle(ctx.smoothRef.current, ang);
  const vis = Math.min(joints.shoulder.visibility ?? 1, joints.elbow.visibility ?? 1, joints.wrist.visibility ?? 1);
  const r = classifyRep(ctx.smoothRef.current, vis, { downAngle: 70, upAngle: 155, minVisible: 0.45 }, ctx.repState.current);
  ctx.repState.current = r.state;
  return r.counted;
}

export function useActivityMachine() {
  const [state, setState] = useState<ActivityState>("idle");
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | undefined>();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const rafRef = useRef<number | null>(null);
  const repState = useRef<RepState>("up");
  const smoothRef = useRef(160);
  const calibYs = useRef<{ sy: number[]; hy: number[] }>({ sy: [], hy: [] });

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    stopStream(streamRef.current);
    streamRef.current = null;
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startPermission = useCallback(async () => {
    setError(undefined);
    setState("permission");
    try {
      if (!videoRef.current) throw new Error("video ref missing");
      setState("loading_model");
      workerRef.current = createPoseWorker();
      await waitForWorkerReady(workerRef.current);
      setState("calibration");
      const stream = await requestCamera(videoRef.current);
      streamRef.current = stream;
      setState("ready");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setState(resolvePermissionError(msg));
    }
  }, []);

  const startActive = useCallback(() => {
    setState("active");
    setCount(0);
    repState.current = "up";
    calibYs.current = { sy: [], hy: [] };
    const ctx: LoopContext = { videoRef, workerRef, calibYs, smoothRef, repState, rafRef };
    const loop = async () => { await runLoopFrame(ctx, setCount, loop); };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const pause = useCallback(() => setState("paused"), []);
  const resume = useCallback(() => setState("active"), []);
  const submit = useCallback(() => setState("submitted"), []);
  const verifying = useCallback(() => setState("verifying"), []);
  const setVerified = useCallback(() => setState("verified"), []);
  const setRejected = useCallback((msg?: string) => { setError(msg); setState("rejected"); }, []);
  const reset = useCallback(() => { cleanup(); setCount(0); setError(undefined); setState("idle"); }, [cleanup]);

  const doCalibrate = useCallback(() => calibrate(calibYs.current.sy, calibYs.current.hy, 0.6), []);

  return { state, count, error, videoRef, startPermission, startActive, pause, resume, submit, verifying, setVerified, setRejected, reset, doCalibrate, cleanup };
}

type LoopContext = {
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  workerRef: React.MutableRefObject<Worker | null>;
  calibYs: React.MutableRefObject<{ sy: number[]; hy: number[] }>;
  smoothRef: React.MutableRefObject<number>;
  repState: React.MutableRefObject<RepState>;
  rafRef: React.MutableRefObject<number | null>;
};

async function runLoopFrame(ctx: LoopContext, setCount: React.Dispatch<React.SetStateAction<number>>, loop: () => Promise<void>): Promise<void> {
  const video = ctx.videoRef.current;
  const worker = ctx.workerRef.current;
  if (!isVideoReady(video, worker)) { ctx.rafRef.current = requestAnimationFrame(loop); return; }
  try {
    await handleVideoFrame({ video: video as HTMLVideoElement, worker: worker as Worker, ctx, setCount });
  } catch { /* frame drop */ }
  ctx.rafRef.current = requestAnimationFrame(loop);
}

function isVideoReady(video: HTMLVideoElement | null, worker: Worker | null): boolean {
  return Boolean(video && worker && video.readyState >= 2);
}

type FrameParams = { video: HTMLVideoElement; worker: Worker; ctx: LoopContext; setCount: React.Dispatch<React.SetStateAction<number>> };

async function handleVideoFrame({ video, worker, ctx, setCount }: FrameParams): Promise<void> {
  const bitmap = await createImageBitmap(video);
  const ts = performance.now();
  const res = await requestFrame(worker, bitmap, ts);
  const lm = res.landmarks;
  if (!lm || lm.length <= 16) return;
  const joints = extractJoints(lm);
  if (!joints) return;
  updateCalibration(ctx.calibYs.current, joints.shoulder, joints.hip);
  const counted = processRep({ smoothRef: ctx.smoothRef, repState: ctx.repState }, joints);
  if (counted) setCount((c) => c + 1);
}
