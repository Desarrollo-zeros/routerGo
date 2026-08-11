export type RepState = "up" | "down";
export type HystCfg = { downAngle: number; upAngle: number; minVisible: number };

export function smoothAngle(prev: number, next: number, alpha = 0.35): number {
  return prev * (1 - alpha) + next * alpha;
}

export function classifyRep(
  angle: number,
  visibility: number,
  cfg: HystCfg,
  prev: RepState,
): { state: RepState; counted: boolean } {
  if (visibility < cfg.minVisible) return { state: prev, counted: false };
  if (prev === "up" && angle < cfg.downAngle) return { state: "down", counted: false };
  if (prev === "down" && angle > cfg.upAngle) return { state: "up", counted: true };
  return { state: prev, counted: false };
}

export function angleAt(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const la = Math.hypot(abx, aby);
  const lc = Math.hypot(cbx, cby);
  if (la === 0 || lc === 0) return 180;
  const cos = Math.max(-1, Math.min(1, dot / (la * lc)));
  return (Math.acos(cos) * 180) / Math.PI;
}
