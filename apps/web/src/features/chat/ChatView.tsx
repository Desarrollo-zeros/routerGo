import React, { useState } from "react";
import { PrimaryCTA } from "../../design-system/PrimaryCTA";
import { SponsorPlacement } from "../../design-system/SponsorPlacement";
import { useChat } from "./useChat";
import type { CatalogEntry } from "../../runtime/types";
import type { HttpApiPort } from "../../runtime/ApiPort";

type Props = { catalog: CatalogEntry[]; balance: number; api: HttpApiPort };

export function ChatView({ catalog, balance, api }: Props): React.ReactElement {
  const [model, setModel] = useState(catalog[0]?.logical_id ?? "");
  const chat = useChat(model, api);
  const [input, setInput] = useState("");
  const entry = catalog.find((c) => c.logical_id === model);

  return (
    <div className="rg-feature-stack">
      <label htmlFor="modelSel" className="rg-secondary-label">Modelo · créditos: {entry?.credit_price ?? "-"} · saldo {balance}</label>
      <select id="modelSel" value={model} onChange={(e) => setModel(e.target.value)} className="rg-control">
        {catalog.map((c) => <option key={c.logical_id} value={c.logical_id}>{c.logical_id} · {c.tier} · {c.credit_price} cr</option>)}
      </select>
      <div className="rg-chat-log">
        {chat.messages.length === 0 ? <p className="rg-muted-copy">Inicia una conversación. El costo en créditos se muestra antes de gastar.</p> : null}
        {chat.messages.map((m, i) => <div className={`rg-chat-message ${m.role}`} key={i}>{m.content}</div>)}
        {chat.error ? <p role="alert" className="rg-error-copy">{chat.error}</p> : null}
      </div>
      <SponsorPlacement placement="chat-inline" />
      <label htmlFor="prompt" className="sr-only">Prompt</label>
      <textarea id="prompt" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu mensaje…" rows={3} className="rg-control rg-prompt" />
      <PrimaryCTA loading={chat.streaming} disabled={!input.trim()} onClick={() => { const v = input; setInput(""); void chat.send(v); }}>{chat.streaming ? "Transmitiendo…" : "Enviar · costo visible arriba"}</PrimaryCTA>
      {chat.streaming ? <button onClick={chat.stop} className="rg-secondary-button">Detener</button> : null}
    </div>
  );
}
