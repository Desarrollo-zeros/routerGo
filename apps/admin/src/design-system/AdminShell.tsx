import React from "react";
import { SkipLink } from "./Primitives";

type AdminShellProps = { brand: React.ReactNode; navigation?: React.ReactNode; children: React.ReactNode };

export function AdminShell({ brand, navigation, children }: AdminShellProps): React.ReactElement {
  return <div className="admin-shell">
    <SkipLink />
    <header className="admin-header"><div className="admin-brand">{brand}</div></header>
    <div className="admin-layout">
      {navigation ? <nav className="admin-navigation" aria-label="Navegación de Studio">{navigation}</nav> : null}
      <main id="main" className="admin-main" tabIndex={-1}>{children}</main>
    </div>
  </div>;
}
