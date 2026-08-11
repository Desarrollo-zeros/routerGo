import { useCallback, useRef, useState } from "react";
import { httpRequest } from "../../adapters/http";
import { connectSse } from "../../adapters/sse";

export type ChatMsg = { role: "user" | "assistant"; content: string };

export function useChat(modelId: string) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const lastIdRef = useRef<string | undefined>(undefined);

  const send = useCallback(async (prompt: string) => {
    setError(null);
    setMessages((m) => [...m, { role: "user", content: prompt }]);
    try {
      const quote = await httpRequest<{ id: string; credit_cost: number }>("/api/quotes", { method: "POST", body: { logical_model_id: modelId, prompt } });
      const run = await httpRequest<{ id: string }>("/api/runs", { method: "POST", body: { quote_id: quote.id, idempotency_key: crypto.randomUUID() } });
      setStreaming(true);
      let acc = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      const url = `/api/runs/${run.id}/events`;
      esRef.current?.close();
      esRef.current = connectSse(url, {
        onEvent(ev) {
          if (ev.id) lastIdRef.current = ev.id;
          if (ev.event === "chunk") { acc += JSON.parse(ev.data).delta ?? ""; setMessages((prev) => { const c = [...prev]; c[c.length - 1] = { role: "assistant", content: acc }; return c; }); }
          if (ev.event === "done") { setStreaming(false); esRef.current?.close(); }
          if (ev.event === "error") { setError(ev.data); setStreaming(false); esRef.current?.close(); }
        },
        onError() { setError("Conexión SSE perdida"); setStreaming(false); },
      }, lastIdRef.current);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); setStreaming(false); }
  }, [modelId]);

  const stop = useCallback(() => { esRef.current?.close(); setStreaming(false); }, []);
  return { messages, streaming, error, send, stop };
}
