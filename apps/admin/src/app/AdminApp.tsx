import React from "react";
import { AdminShell } from "../design-system/AdminShell";
import { Panel, StatusMessage } from "../design-system/Primitives";

export function AdminApp(): React.ReactElement {
  return <AdminShell brand={<span aria-label="RouterGo Studio">RouterGo Studio</span>}>
    <h1>Studio</h1>
    <Panel title="Área de administración">
      <StatusMessage>La composición está lista para cargar módulos autorizados.</StatusMessage>
    </Panel>
  </AdminShell>;
}
