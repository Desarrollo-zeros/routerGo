import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

type Landmark = { x: number; y: number; visibility?: number };

type PoseLandmarkerInstance = {
  detectForVideo(video: HTMLVideoElement, timestamp: number): { landmarks?: Landmark[][] };
  close?: () => void;
};

export type PoseDetector = {
  detect(video: HTMLVideoElement, timestamp: number): Landmark[] | null;
  close(): void;
};

const WASM_URL = "https://unpkg.com/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

export async function createPoseDetector(): Promise<PoseDetector> {
  const fileset = await FilesetResolver.forVisionTasks(WASM_URL);
  const landmarker = await PoseLandmarker.createFromOptions(fileset, {
    baseOptions: { modelAssetPath: MODEL_URL },
    runningMode: "VIDEO",
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
  });
  return {
    detect: (video, timestamp) => landmarker.detectForVideo(video, timestamp).landmarks?.[0] ?? null,
    close: () => landmarker.close?.(),
  };
}
