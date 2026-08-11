const code = `
let landmarker=null;
let running=false;
self.onmessage = async (e)=>{
  const {type, payload}=e.data||{};
  if(type==='init'){
    try{
      // Dynamic import keeps worker bundle small; fails gracefully if CDN blocked
      const mod = await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision/vision_bundle.mjs');
      const { PoseLandmarker, FilesetResolver } = mod;
      const fileset = await FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm');
      landmarker = await PoseLandmarker.createFromOptions(fileset, {
        baseOptions:{ modelAssetPath:'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task' },
        runningMode:'VIDEO', numPoses:1, minPoseDetectionConfidence:0.5
      });
      self.postMessage({type:'ready'});
    }catch(err){ self.postMessage({type:'error', payload:String(err)}); }
  }
  if(type==='frame'){
    if(!landmarker||running) return;
    running=true;
    try{
      const res = landmarker.detectForVideo(payload.bitmap, payload.ts);
      const lm = res.landmarks?.[0] ?? null;
      self.postMessage({type:'result', payload:{ landmarks:lm, ts:payload.ts }}, []);
      payload.bitmap.close?.();
    }catch(err){ self.postMessage({type:'error', payload:String(err)}); }
    running=false;
  }
};
`;
export function createPoseWorker(): Worker {
  const blob = new Blob([code], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  return new Worker(url, { type: "module" });
}
