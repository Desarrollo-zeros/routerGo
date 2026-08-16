import React from "react";
import type { HttpApiPort } from "../../runtime/ApiPort";
import type { RuntimeManifest } from "../../runtime/types";

export function DeveloperView({ api }: { api: HttpApiPort }): React.ReactElement {
  const [manifest, setManifest] = React.useState<RuntimeManifest>();
  React.useEffect(() => { void api.getManifest().then(setManifest).catch(() => setManifest(undefined)); }, [api]);
  const routes = manifest?.apiRoutes.filter((route) => route.enabled && route.auth_policy_key === "api_key") ?? [];
  return <main className="rg-developer-page"><header className="rg-developer-hero"><p className="rg-wallet-kicker">Para desarrolladores</p><h1>Construye sobre<br /><span>RouterGo.</span></h1><p>Usa las rutas publicadas por el runtime y mantén tu integración alineada con la versión activa.</p></header><section className="rg-developer-card"><div className="rg-developer-card-head"><div><span>Runtime activo</span><h2>{manifest ? `v${manifest.version}` : "Cargando…"}</h2></div><strong>{routes.length} rutas</strong></div><div className="rg-developer-routes">{routes.map((route) => <div className="rg-developer-route" key={route.route_key}><code>{route.method}</code><span>{route.path_template}</span></div>)}</div><p className="rg-developer-note">Las credenciales se crean y revocan desde el entorno de administración. Nunca las guardes en el navegador.</p></section></main>;
}
