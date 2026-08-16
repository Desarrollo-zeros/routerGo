import React from "react";
import { Panel, StatusMessage } from "../../design-system/Primitives";

export type EconomySummary = { balance: string; reserved: string; budgetUsed: string; budgetLimit: string };

export function EconomyReadView({ authorized, summary }: { authorized: boolean; summary?: EconomySummary }): React.ReactElement {
  if (!authorized) return <Panel title="Economy"><StatusMessage tone="error">Insufficient privilege for economy data.</StatusMessage></Panel>;
  if (!summary) return <Panel title="Economy"><StatusMessage>Economy data is not available.</StatusMessage></Panel>;
  return <Panel title="Economy"><dl className="admin-summary"><div><dt>Balance</dt><dd>{summary.balance}</dd></div><div><dt>Reserved</dt><dd>{summary.reserved}</dd></div><div><dt>Budget</dt><dd>{summary.budgetUsed} / {summary.budgetLimit}</dd></div></dl><StatusMessage>Read-only operator view.</StatusMessage></Panel>;
}
