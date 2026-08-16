import React from "react";
import type { WebRuntimeManifest } from "@routergo/shared";

export function RuntimeNavigation({ manifest }: { manifest: WebRuntimeManifest }): React.ReactElement {
  const routes = new Map(manifest.ui.routes.map((route) => [route.route_key, route]));
  const items = manifest.ui.navigation
    .filter((item) => item.enabled && routes.get(item.route_key)?.enabled)
    .sort((left, right) => left.order_index - right.order_index);
  return <ul className="admin-runtime-navigation">{items.map((item) => {
    const route = routes.get(item.route_key);
    return route ? <li key={item.route_key}><a href={route.path}>{item.label_key}</a></li> : null;
  })}</ul>;
}
