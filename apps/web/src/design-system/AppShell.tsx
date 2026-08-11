import React from "react";

type AppShellProps = {
  header?: React.ReactNode;
  nav?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({ header, nav, children }: AppShellProps): React.ReactElement {
  return (
    <div className="rg-shell">
      <a href="#main" className="rg-skip">
        Saltar al contenido
      </a>
      {header ? <header className="rg-header">{header}</header> : null}
      <div className="rg-layout">
        {nav ? <nav className="rg-nav" aria-label="Principal">{nav}</nav> : null}
        <main id="main" className="rg-main">
          {children}
        </main>
      </div>
      <style>{css}</style>
    </div>
  );
}

const css = `
.rg-shell{min-height:100dvh;background:var(--rg-semantic-bg,#0a0a0f);color:var(--rg-semantic-text,#f2f2f7);display:flex;flex-direction:column}
.rg-skip{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.rg-skip:focus{left:12px;top:12px;width:auto;height:auto;padding:8px 12px;background:#fff;color:#000;border-radius:8px;z-index:100}
.rg-header{position:sticky;top:0;z-index:10;background:var(--rg-semantic-surface,#12121a);border-bottom:1px solid #222;padding:12px 16px;padding-top:max(12px,env(safe-area-inset-top))}
.rg-layout{display:flex;flex:1;gap:16px;max-width:960px;width:100%;margin:0 auto;padding:16px}
.rg-nav{min-width:200px}
.rg-main{flex:1;min-width:0}
@media(max-width:720px){.rg-layout{flex-direction:column}.rg-nav{min-width:0}}
`;
