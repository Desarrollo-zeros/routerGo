import React from "react";
import type { WebRuntimeManifest } from "@routergo/shared";
import { AdminShell } from "../design-system/AdminShell";
import { Panel, StatusMessage } from "../design-system/Primitives";
import { ModelCatalogView } from "../features/catalog/ModelCatalogView";
import { ProviderView } from "../features/providers/ProviderView";
import { RuntimeConfigView } from "../features/runtime/RuntimeConfigView";

export function AdminApp({ manifest }: { manifest?: WebRuntimeManifest }): React.ReactElement {
  return <AdminShell brand={<span aria-label="RouterGo Studio">RouterGo Studio</span>}>
    <h1>Studio</h1>
    {manifest ? <div className="admin-stack"><RuntimeConfigView manifest={manifest} /><ModelCatalogView models={manifest.catalog} /><ProviderView models={manifest.catalog} /></div> : <Panel title="Área de administración"><StatusMessage>La configuración runtime no está disponible.</StatusMessage></Panel>}
  </AdminShell>;
}
