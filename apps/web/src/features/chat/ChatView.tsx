import React, { useState } from "react";
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
    <div className="rg-chat-page">
      <section className="rg-chat-hero"><p className="rg-wallet-kicker">Tu espacio de inteligencia</p><h1>Piensa en voz alta.</h1><p>Elige un modelo, escribe lo que necesitas y conoce el costo antes de enviar.</p></section>
      <section className="rg-chat-model-card"><div><span className="rg-chat-model-icon">✦</span><div><p>Modelo activo</p><strong>{entry?.logical_id ?? "Sin modelo"}</strong></div></div><label htmlFor="modelSel">Cambiar modelo<select id="modelSel" value={model} onChange={(e) => setModel(e.target.value)}>{catalog.map((c) => <option key={c.logical_id} value={c.logical_id}>{c.logical_id} · {c.tier} · {c.credit_price} cr</option>)}</select></label><span className="rg-chat-cost">{entry?.credit_price ?? "-"} cr / solicitud</span></section>
      <section className="rg-chat-stage"><div className="rg-chat-stage-head"><span>Conversación nueva</span><span>{balance} GoCredits</span></div><div className="rg-chat-log">{chat.messages.length === 0 ? <div className="rg-chat-empty"><span className="rg-empty-icon">✦</span><h2>¿Qué quieres resolver hoy?</h2><p>Escribe una pregunta, una idea o un problema. Tu saldo y el costo estarán siempre visibles.</p></div> : null}{chat.messages.map((m, i) => <div className={`rg-chat-message ${m.role}`} key={i}>{m.content}</div>)}{chat.error ? <p role="alert" className="rg-error-copy">No se pudo completar la solicitud: {chat.error}</p> : null}</div><div className="rg-chat-composer"><label htmlFor="prompt" className="sr-only">Prompt</label><textarea id="prompt" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe tu mensaje…" rows={3} /><button disabled={chat.streaming || !input.trim()} onClick={() => { const v = input; setInput(""); void chat.send(v); }}>{chat.streaming ? "Transmitiendo…" : "Enviar"}<span>↗</span></button></div></section>
      {chat.streaming ? <button onClick={chat.stop} className="rg-secondary-button">Detener</button> : null}
      <SponsorPlacement placement="chat-inline"><div className="rg-sponsor-content"><span>Patrocinado</span><strong>Una pausa también impulsa tus ideas.</strong><small>Descubre una marca que acompaña tu momento.</small></div></SponsorPlacement>
    </div>
  );
}
