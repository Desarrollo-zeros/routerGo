import React from "react";
import { Panel, StatusMessage } from "../../design-system/Primitives";

export type LedgerRow = { id: string; kind: string; amount: string; occurredAt: string };

export function LedgerReadView({ authorized, rows = [] }: { authorized: boolean; rows?: readonly LedgerRow[] }): React.ReactElement {
  if (!authorized) return <Panel title="Ledger"><StatusMessage tone="error">Insufficient privilege for ledger data.</StatusMessage></Panel>;
  return <Panel title="Ledger"><div className="admin-table-wrap"><table className="admin-table"><caption className="sr-only">Read-only ledger entries</caption><thead><tr><th scope="col">Entry</th><th scope="col">Kind</th><th scope="col">Amount</th><th scope="col">Date</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><th scope="row">{row.id}</th><td>{row.kind}</td><td>{row.amount}</td><td>{row.occurredAt}</td></tr>)}</tbody></table></div>{rows.length === 0 ? <StatusMessage>No ledger entries available.</StatusMessage> : null}</Panel>;
}
