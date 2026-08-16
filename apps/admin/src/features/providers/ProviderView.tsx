import React from "react";
import type { WebCatalogEntry } from "@routergo/shared";
import { Panel } from "../../design-system/Primitives";

export function ProviderView({ models }: { models: readonly WebCatalogEntry[] }): React.ReactElement {
  const gateways = [...new Set(models.map((model) => model.gateway_id))];
  return <Panel title="Provider gateways"><ul className="admin-list">{gateways.map((gateway) => <li key={gateway}><span>{gateway}</span><span>{models.filter((model) => model.gateway_id === gateway && model.enabled).length} active models</span></li>)}</ul></Panel>;
}
