export type CalibResult = { top: number; bottom: number; side: "left" | "right"; ok: boolean; reason?: string };

export function calibrate(
  shoulderY: number[],
  hipY: number[],
  lightScore: number,
): CalibResult {
  if (shoulderY.length < 8) return { top: 0, bottom: 0, side: "left", ok: false, reason: "Encuadre incompleto" };
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const s = avg(shoulderY);
  const h = avg(hipY);
  if (!Number.isFinite(s) || !Number.isFinite(h)) return { top: 0, bottom: 0, side: "left", ok: false, reason: "Landmarks no válidos" };
  if (lightScore < 0.25) return { top: 0, bottom: 0, side: "left", ok: false, reason: "Iluminación baja" };
  const range = Math.abs(h - s);
  if (range < 0.08) return { top: 0, bottom: 0, side: "left", ok: false, reason: "Acércate / aléjate" };
  const top = Math.min(s, h) - range * 0.15;
  const bottom = Math.max(s, h) + range * 0.05;
  return { top, bottom, side: "left", ok: true };
}
