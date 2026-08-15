import React from "react";

type Props = {
  title: string;
  highlight?: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
};

export function HeroSection({ title, highlight, description, icon, children }: Props): React.ReactElement {
  return (
    <section className="rg-hero">
      {icon ? <div className="rg-hero-icon">{icon}</div> : null}
      <h1 className="rg-hero-title">
        {title}
        {highlight ? <span className="rg-hero-highlight"> {highlight}</span> : null}
      </h1>
      {description ? <p className="rg-hero-desc">{description}</p> : null}
      {children}
      <style>{css}</style>
    </section>
  );
}

const css = `
.rg-hero{display:flex;flex-direction:column;align-items:center;text-align:center;padding:24px 16px 32px;gap:12px}
.rg-hero-icon{font-size:48px;margin-bottom:8px}
.rg-hero-title{font-size:28px;font-weight:800;line-height:1.2;margin:0;color:var(--rg-color-text-primary,CanvasText)}
.rg-hero-highlight{color:var(--rg-color-brand-soft,Highlight)}
.rg-hero-desc{font-size:15px;line-height:1.5;color:var(--rg-color-text-secondary,CanvasText);margin:0;max-width:320px}
@media(min-width:640px){.rg-hero-title{font-size:36px}.rg-hero-desc{font-size:16px}}
`;
