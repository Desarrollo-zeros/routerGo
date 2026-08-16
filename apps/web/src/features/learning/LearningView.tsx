import React from "react";
import type { HttpApiPort } from "../../runtime/ApiPort";

export type LearningRoute = { id: string; key: string; title: string; summary: string; lessonCount: number; rewardCredits: string; lessons: { title: string }[] };

export function LearningView({ api }: { api: HttpApiPort }): React.ReactElement {
  const [routes, setRoutes] = React.useState<LearningRoute[]>([]);
  const [selected, setSelected] = React.useState<LearningRoute>();
  const [state, setState] = React.useState<"loading" | "ready" | "error">("loading");
  React.useEffect(() => { void api.request<LearningRoute[]>({ routeKey: "learning-list" }).then((items) => { setRoutes(items); setState("ready"); }).catch(() => setState("error")); }, [api]);
  return <main className="rg-learning-page"><header className="rg-learning-hero"><p className="rg-wallet-kicker">Aprendizaje</p><h1>Aprende algo útil.<br /><span>Úsalo al instante.</span></h1><p>Rutas breves publicadas por RouterGo para ayudarte a sacar más partido a cada conversación.</p></header>{selected ? <LearningDetail route={selected} onBack={() => setSelected(undefined)} /> : <section className="rg-learning-list" aria-live="polite">{state === "loading" ? <p className="rg-muted-copy">Cargando rutas publicadas…</p> : null}{state === "error" ? <p className="rg-error-copy">No pudimos cargar las rutas. Intenta actualizar.</p> : null}{state === "ready" && routes.length === 0 ? <EmptyLearning /> : null}{routes.map((route) => <LearningCard key={route.id} route={route} onOpen={() => setSelected(route)} />)}</section>}</main>;
}

function LearningCard({ route, onOpen }: { route: LearningRoute; onOpen: () => void }): React.ReactElement {
  return <article className="rg-learning-card"><div className="rg-learning-icon">✦</div><div className="rg-learning-copy"><span>Ruta publicada</span><h2>{route.title}</h2><p>{route.summary}</p><div className="rg-learning-meta"><strong>{route.lessonCount} lecciones</strong><strong>+{route.rewardCredits} GoCredits</strong></div></div><button className="rg-learning-cta" type="button" onClick={onOpen}>Abrir ruta</button></article>;
}

function LearningDetail({ route, onBack }: { route: LearningRoute; onBack: () => void }): React.ReactElement {
  return <section className="rg-learning-detail"><button className="rg-secondary-button" type="button" onClick={onBack}>← Volver a rutas</button><div><span className="rg-learning-copy-label">Ruta publicada</span><h2>{route.title}</h2><p>{route.summary}</p></div><ol>{route.lessons.map((lesson, index) => <li key={`${route.id}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><strong>{lesson.title}</strong></li>)}</ol><p className="rg-learning-note">La recompensa de +{route.rewardCredits} GoCredits se habilita cuando la ruta tenga verificación activa.</p></section>;
}

function EmptyLearning(): React.ReactElement { return <div className="rg-learning-empty"><span>◌</span><div><h2>Estamos preparando nuevas rutas</h2><p>Vuelve pronto para continuar aprendiendo y desbloquear recompensas.</p></div></div>; }
