import React from "react";

type Props = {
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  ariaLabel?: string;
};

export function PrimaryCTA({ disabled, loading, children, onClick, type = "button", ariaLabel }: Props): React.ReactElement {
  return (
    <>
      <button
        type={type}
        className="rg-cta"
        disabled={disabled || loading}
        onClick={onClick}
        aria-label={ariaLabel}
        aria-busy={loading || undefined}
      >
        {loading ? "Cargando…" : children}
      </button>
      <style>{ctaCss}</style>
    </>
  );
}

const ctaCss = `
.rg-cta{width:100%;min-height:44px;padding:12px 20px;border-radius:999px;border:0;background:var(--rg-primitive-color-brand,#7c5cff);color:#fff;font-weight:700;font-size:16px;cursor:pointer}
.rg-cta:focus-visible{outline:2px solid var(--rg-primitive-color-brandSoft,#a99bff);outline-offset:2px}
.rg-cta:disabled{opacity:.5;cursor:not-allowed}
.rg-cta:hover:not(:disabled){filter:brightness(1.08)}
.rg-cta:active:not(:disabled){transform:scale(.99)}
@media(prefers-reduced-motion:reduce){.rg-cta{transition:none}}
`;
