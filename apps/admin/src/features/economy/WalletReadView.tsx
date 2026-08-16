import React from "react";
import { Panel, StatusMessage } from "../../design-system/Primitives";
import type { AdminWalletSummary } from "../../runtime/AdminWalletClient";

export function WalletReadView({ authorized, summary }: { authorized: boolean; summary?: AdminWalletSummary }): React.ReactElement {
  if (!authorized) return <Panel title="Wallet"><StatusMessage tone="error">Insufficient privilege for wallet data.</StatusMessage></Panel>;
  if (!summary) return <Panel title="Wallet"><StatusMessage>Wallet data is not available.</StatusMessage></Panel>;
  return <Panel title="Wallet"><dl className="admin-summary"><div><dt>Balance</dt><dd>{summary.balance} GoCredits</dd></div><div><dt>Wallet</dt><dd className="admin-mono">{summary.walletId}</dd></div><div><dt>Version</dt><dd>{summary.version}</dd></div></dl><StatusMessage>Read-only operator view.</StatusMessage></Panel>;
}
