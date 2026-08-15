import React from "react";

type StatVariant = "default" | "success" | "warning" | "danger" | "brand";

type Props = {
  value: number | string;
  label: string;
  variant?: StatVariant;
  icon?: React.ReactNode;
  ariaLabel?: string;
};

const variantStyles: Record<StatVariant, { bg: string; border: string; valueColor: string }> = {
  default: {
    bg: "var(--rg-color-surface-muted, Canvas)",
    border: "var(--rg-color-surface-muted, ButtonFace)",
    valueColor: "var(--rg-color-text-primary, CanvasText)",
  },
  success: {
    bg: "var(--rg-color-surface, Canvas)",
    border: "var(--rg-color-success, ButtonFace)",
    valueColor: "var(--rg-color-success, CanvasText)",
  },
  warning: {
    bg: "var(--rg-color-surface, Canvas)",
    border: "var(--rg-color-warning, ButtonFace)",
    valueColor: "var(--rg-color-warning, CanvasText)",
  },
  danger: {
    bg: "var(--rg-color-surface, Canvas)",
    border: "var(--rg-color-danger, ButtonFace)",
    valueColor: "var(--rg-color-danger, CanvasText)",
  },
  brand: {
    bg: "var(--rg-color-surface, Canvas)",
    border: "var(--rg-color-brand, ButtonFace)",
    valueColor: "var(--rg-color-brand, CanvasText)",
  },
};

export function StatCard({ value, label, variant = "default", icon, ariaLabel }: Props): React.ReactElement {
  const styles = variantStyles[variant];
  return (
    <div
      className="rg-stat"
      role="group"
      aria-label={ariaLabel || `${label}: ${value}`}
      style={{
        background: styles.bg,
        borderColor: styles.border,
      }}
    >
      {icon ? <span className="rg-stat-icon">{icon}</span> : null}
      <span className="rg-stat-value" style={{ color: styles.valueColor }}>
        {typeof value === "number" ? value.toLocaleString("es") : value}
      </span>
      <span className="rg-stat-label">{label}</span>
      <style>{css}</style>
    </div>
  );
}

const css = `
.rg-stat{display:flex;flex-direction:column;align-items:center;gap:4px;padding:16px 12px;border-radius:var(--rg-primitive-radius-lg,16px);border:1px solid;min-width:80px;text-align:center;flex:1}
.rg-stat-icon{font-size:20px;margin-bottom:4px}
.rg-stat-value{font-size:28px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.rg-stat-label{font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--rg-color-text-secondary, CanvasText)}
`;
