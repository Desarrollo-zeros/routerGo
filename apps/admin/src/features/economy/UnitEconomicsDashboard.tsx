import React from "react";
import { Panel, StatusMessage } from "../../design-system/Primitives";

export type UnitEconomicsSummary = {
  revenueMicro: number;
  providerCostMicro: number;
  infraCostMicro: number;
  contributionMicro: number;
  rewardLiabilityCredits: number;
};

export function UnitEconomicsDashboard({ authorized, summary }: { authorized: boolean; summary?: UnitEconomicsSummary }): React.ReactElement {
  if (!authorized) return <Panel title="Unit economics"><StatusMessage tone="error">Insufficient privilege for unit economics data.</StatusMessage></Panel>;
  if (!summary) return <Panel title="Unit economics"><StatusMessage>Unit economics data is not available.</StatusMessage></Panel>;
  return <Panel title="Unit economics"><div className="admin-summary admin-summary-five">{metric("Revenue", summary.revenueMicro, "USD micro-units")}{metric("Provider cost", summary.providerCostMicro, "USD micro-units")}{metric("Infrastructure", summary.infraCostMicro, "USD micro-units")}{metric("Contribution", summary.contributionMicro, "USD micro-units")}{metric("Reward liability", summary.rewardLiabilityCredits, "GoCredits")}</div><StatusMessage>Read-only operator view. Revenue and costs are fixed-precision units; liability remains GoCredits.</StatusMessage></Panel>;
}

function metric(label: string, value: number, unit: string): React.ReactElement {
  return <div><dt>{label}</dt><dd>{value.toLocaleString()}</dd><small>{unit}</small></div>;
}
