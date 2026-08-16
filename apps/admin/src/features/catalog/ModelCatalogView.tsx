import React from "react";
import type { WebCatalogEntry } from "@routergo/shared";
import { Panel } from "../../design-system/Primitives";

export function ModelCatalogView({ models }: { models: readonly WebCatalogEntry[] }): React.ReactElement {
  return <Panel title="Model catalog"><div className="admin-table-wrap"><table className="admin-table"><caption className="sr-only">Configured model catalog</caption><thead><tr><th scope="col">Model</th><th scope="col">Gateway</th><th scope="col">Tier</th><th scope="col">State</th></tr></thead><tbody>{models.map((model) => <tr key={model.logical_id}><th scope="row">{model.logical_id}</th><td>{model.gateway_id}</td><td>{model.tier}</td><td>{model.enabled ? "Enabled" : "Disabled"}</td></tr>)}</tbody></table></div></Panel>;
}
