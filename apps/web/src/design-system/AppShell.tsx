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
.rg-shell{min-height:100dvh;background:var(--rg-color-bg,Canvas);color:var(--rg-color-text-primary,CanvasText);display:flex;flex-direction:column}
.rg-skip{position:absolute;left:-9999px;top:auto;width:1px;height:1px;overflow:hidden}
.rg-skip:focus{left:12px;top:12px;width:auto;height:auto;padding:8px 12px;background:Canvas;color:CanvasText;border-radius:8px;z-index:100}
.rg-header{position:sticky;top:0;z-index:10;background:var(--rg-color-surface,Canvas);border-bottom:1px solid var(--rg-color-surface-muted,ButtonFace);padding:12px 16px;padding-top:max(12px,env(safe-area-inset-top))}
.rg-layout{display:flex;flex:1;gap:clamp(24px,4vw,64px);max-width:1440px;width:100%;margin:0 auto;padding:32px clamp(16px,3vw,40px) 56px}
.rg-nav{min-width:200px}
.rg-main{flex:1;min-width:0}
@media(max-width:720px){.rg-layout{flex-direction:column;padding:20px 12px 112px}.rg-nav{min-width:0}}
`;
