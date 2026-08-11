export type SseEvent = { id: string; event: string; data: string };

export type SseHandlers = {
  onEvent: (ev: SseEvent) => void;
  onError?: (err: Event) => void;
  onOpen?: () => void;
};

export function connectSse(url: string, handlers: SseHandlers, lastEventId?: string): EventSource {
  const full = lastEventId ? `${url}${url.includes("?") ? "&" : "?"}lastEventId=${encodeURIComponent(lastEventId)}` : url;
  const es = new EventSource(full, { withCredentials: true });
  es.onopen = () => handlers.onOpen?.();
  es.onerror = (e) => handlers.onError?.(e);
  es.onmessage = (e: MessageEvent) => {
    handlers.onEvent({ id: (e as unknown as { lastEventId: string }).lastEventId ?? "", event: "message", data: e.data });
  };
  const types = ["chunk", "done", "error", "heartbeat"];
  for (const t of types) {
    es.addEventListener(t, (e) => {
      const me = e as MessageEvent;
      const id = (me as unknown as { lastEventId: string }).lastEventId ?? "";
      handlers.onEvent({ id, event: t, data: me.data });
    });
  }
  return es;
}

export function parseSseData<T>(raw: string): T {
  return JSON.parse(raw) as T;
}
