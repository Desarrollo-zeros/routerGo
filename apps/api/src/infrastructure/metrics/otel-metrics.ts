type Labels = Record<string, string>;

interface Counter { add(v: number, labels?: Labels): void; }
interface Histogram { record(v: number, labels?: Labels): void; }
interface Gauge { set(v: number, labels?: Labels): void; }

function createCounter(name: string): Counter & { name: string; values: Array<{ v: number; labels?: Labels }> } {
  const values: Array<{ v: number; labels?: Labels }> = [];
  return { name, values, add(v, labels) { values.push({ v, labels }); } };
}
function createHistogram(name: string): Histogram & { name: string; values: Array<{ v: number; labels?: Labels }> } {
  const values: Array<{ v: number; labels?: Labels }> = [];
  return { name, values, record(v, labels) { values.push({ v, labels }); } };
}
function createGauge(name: string): Gauge & { name: string; values: Array<{ v: number; labels?: Labels }> } {
  const values: Array<{ v: number; labels?: Labels }> = [];
  return { name, values, set(v, labels) { values.push({ v, labels }); } };
}

export const llmRequestsTotal = createCounter('llm_requests_total');
export const ttftHistogram = createHistogram('llm_ttft_seconds');
export const credentialWindowUsagePct = createGauge('credential_window_usage_pct');
export const provider429Total = createCounter('provider_429_total');

export const metrics = {
  llmRequestsTotal, ttftHistogram, credentialWindowUsagePct, provider429Total,
  recordLlmRequest(labels: Labels & { status: string; model: string }): void {
    llmRequestsTotal.add(1, labels);
  },
  recordTtft(seconds: number, labels?: Labels): void {
    ttftHistogram.record(seconds, labels);
  },
  setWindowUsage(pct: number, labels: Labels & { quota_scope_id: string; window_type: string }): void {
    credentialWindowUsagePct.set(pct, labels);
  },
  inc429(labels: Labels & { gateway: string; quota_scope_id?: string }): void {
    provider429Total.add(1, labels);
  },
};
