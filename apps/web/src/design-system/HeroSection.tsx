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
.rg-hero-icon{font-size:48px;margin-bottom:8px;filter:drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))}
.rg-hero-title{font-size:28px;font-weight:800;line-height:1.2;margin:0;color:var(--rg-primitive-color-textPrimary, #f8fafc)}
.rg-hero-highlight{background:linear-gradient(135deg, #8b5cf6 0%, #a78bfa 50%, #c4b5fd 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.rg-hero-desc{font-size:15px;line-height:1.5;color:var(--rg-primitive-color-textSecondary, #94a3b8);margin:0;max-width:320px}
@media(min-width:640px){.rg-hero-title{font-size:36px}.rg-hero-desc{font-size:16px}}
`;
