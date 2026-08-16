import React from "react";
import type { HttpApiPort } from "../../runtime/ApiPort";
type Content = { slug: string; title: string; body: string };

export function HelpView({ api }: { api: HttpApiPort }): React.ReactElement {
  const [topics, setTopics] = React.useState<Content[]>([]);
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  React.useEffect(() => { void api.request<Content[]>({ routeKey: "content-list" }).then((items) => { setTopics(items); setState("ready"); }).catch(() => setState("error")); }, [api]);
  return <main className="rg-help-page"><header className="rg-help-hero"><p className="rg-wallet-kicker">Centro de ayuda</p><h1>Todo claro.<br /><span>Desde el primer paso.</span></h1><p>Respuestas cortas para que puedas ganar, aprender y usar RouterGo con confianza.</p></header><section className="rg-help-list" aria-live="polite">{state === "loading" ? <p className="rg-muted-copy">Cargando contenido publicado…</p> : null}{state === "error" ? <p className="rg-error-copy">No pudimos cargar el contenido. Intenta actualizar.</p> : null}{topics.map((topic, index) => <article className="rg-help-card" key={topic.slug}><span>{String(index + 1).padStart(2, "0")}</span><div><h2>{topic.title}</h2><p>{topic.body}</p></div></article>)}</section><section className="rg-help-note"><strong>¿Tienes un problema?</strong><p>Revisa primero el estado del servicio y vuelve a intentar. Si el error persiste, conserva el mensaje técnico para soporte.</p></section></main>;
}
