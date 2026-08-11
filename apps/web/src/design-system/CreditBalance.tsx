import React from "react";

type Props = {
  balance: number;
  label?: string;
  pending?: number;
};

export function CreditBalance({ balance, label = "créditos disponibles", pending }: Props): React.ReactElement {
  return (
    <div className="rg-balance" role="status" aria-live="polite">
      <span className="rg-balance-label">{label}</span>
      <span className="rg-balance-value" aria-label={`${balance} créditos`}>
        {balance.toLocaleString("es")}
      </span>
      {pending !== undefined && pending > 0 ? <span className="rg-balance-pending">+{pending} provisional</span> : null}
      <style>{css}</style>
    </div>
  );
}

const css = `
.rg-balance{display:flex;flex-direction:column;gap:4px;padding:12px 16px;border-radius:var(--rg-primitive-radius-lg,16px);background:var(--rg-primitive-color-surfaceMuted,#1a1a26);border:1px solid #232336}
.rg-balance-label{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--rg-primitive-color-textSecondary,#a1a1b5)}
.rg-balance-value{font-size:28px;font-weight:700;line-height:1;color:var(--rg-primitive-color-textPrimary,#f2f2f7);font-variant-numeric:tabular-nums}
.rg-balance-pending{font-size:12px;color:var(--rg-primitive-color-warning,#f5a623)}
`;
