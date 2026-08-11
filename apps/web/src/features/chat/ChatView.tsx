import React, { useState } from "react";
import { PrimaryCTA } from "../../design-system/PrimaryCTA";
import { SponsorPlacement } from "../../design-system/SponsorPlacement";
import { useChat } from "./useChat";
import type { CatalogEntry } from "../../runtime/types";

type Props = { catalog: CatalogEntry[]; balance: number };

export function ChatView({ catalog, balance }: Props): React.ReactElement {
  const [model, setModel] = useState(catalog[0]?.logical_id ?? "");
  const chat = useChat(model);
  const [input, setInput] = useState("");
  const entry = catalog.find((c) => c.logical_id === model);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <label htmlFor="modelSel" style={{ fontSize: 12, color: "#a1a1b5" }}>Modelo · créditos: {entry?.credit_price ?? "-"} · saldo {balance}</label>
      <select id="modelSel" value={model} onChange={(e) => setModel(e.target.value)} style={{ minHeight: 44, borderRadius: 12, padding: "8px 12px", background: "#12121a", color: "#f2f2f7", border: "1px solid #232336" }}>
        {catalog.map((c) => <option key={c.logical_id} value={c.logical_id}>{c.logical_id} · {c.tier} · {c.credit_price} cr</option>)}
      </select>
      <div style={{ minHeight: 160, border: "1px solid #232336", borderRadius: 12, padding: 12, background: "#0f0f18", display: "flex", flexDirection: "column", gap: 8 }}>
        {chat.messages.length === 0 ? <p style={{ color: "#6b6b80", fontSize: 14, margin: 0 }}>Inicia una conversación. El costo en créditos se muestra antes de gastar.</p> : null}
        {chat.messages.map((m, i) => <div key={i} style={{ padding: "8px 10px", borderRadius: 10, background: m.role === "user" ? "#1a1a26" : "#151520", fontSize: 14 }}>{m.content}</div>)}
        {chat.error ? <p role="alert" style={{ color: "#ff4d6a", fontSize: 13 }}>{chat.error}</p> : null}
      </div>
      <SponsorPlacement placement="chat-inline" />
      <label htmlFor="prompt" className="sr-only">Prompt</label>
      <textarea id="prompt" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu mensaje…" rows={3} style={{ borderRadius: 12, padding: 12, background: "#12121a", color: "#f2f2f7", border: "1px solid #232336", resize: "vertical" }} />
      <PrimaryCTA loading={chat.streaming} disabled={!input.trim()} onClick={() => { const v = input; setInput(""); void chat.send(v); }}>{chat.streaming ? "Transmitiendo…" : "Enviar · costo visible arriba"}</PrimaryCTA>
      {chat.streaming ? <button onClick={chat.stop} style={{ minHeight: 44, borderRadius: 999, border: "1px solid #333", background: "transparent", color: "#a1a1b5" }}>Detener</button> : null}
    </div>
  );
}
