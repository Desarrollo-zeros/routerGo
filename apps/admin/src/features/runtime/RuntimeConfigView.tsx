import React from "react";
import type { WebRuntimeManifest } from "@routergo/shared";
import { Button, Panel, StatusMessage } from "../../design-system/Primitives";

export function RuntimeConfigView({ manifest, onPublish }: { manifest: WebRuntimeManifest; onPublish?: () => void }): React.ReactElement {
  return <Panel title="Runtime configuration">
    <dl className="admin-summary"><div><dt>Version</dt><dd>{manifest.version}</dd></div><div><dt>Hash</dt><dd className="admin-mono">{manifest.contentHash}</dd></div><div><dt>Routes</dt><dd>{manifest.apiRoutes.filter((route) => route.enabled).length}</dd></div></dl>
    <StatusMessage>{onPublish ? "Ready for an audited publish action." : "Publish is available through the audited application boundary."}</StatusMessage>
    <Button onClick={onPublish} disabled={!onPublish}>Publish configuration</Button>
  </Panel>;
}
