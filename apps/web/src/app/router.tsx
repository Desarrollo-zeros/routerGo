import React from "react";
import { createBrowserRouter, RouterProvider, Link, Outlet } from "react-router-dom";
import { ActivityView } from "../features/activity/ActivityView";
import { ChatView } from "../features/chat/ChatView";
import { WalletView } from "../features/wallet/WalletView";
import { EconomySimulator } from "../features/economy/EconomySimulator";
import { AppShell } from "../design-system/AppShell";
import { CreditBalance } from "../design-system/CreditBalance";
import type { RuntimeBundle } from "../runtime/bootstrap";

function Layout({ bundle }: { bundle: RuntimeBundle }): React.ReactElement {
  const [balance, setBalance] = React.useState(0);
  React.useEffect(() => {
    fetch("/api/wallet", { credentials: "include" }).then((r) => r.json()).then((j) => setBalance(j.balance ?? 0)).catch(() => {});
  }, []);
  const nav = (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <Link to="/" style={{ color: "#a99bff", fontWeight: 700, textDecoration: "none" }}>RouterGo</Link>
      <Link to="/" style={linkStyle}>Actividad</Link>
      <Link to="/chat" style={linkStyle}>Chat</Link>
      <Link to="/wallet" style={linkStyle}>Billetera</Link>
      <Link to="/economy" style={linkStyle}>Economía (admin)</Link>
    </div>
  );
  const header = <CreditBalance balance={balance} />;
  return <AppShell header={header} nav={nav}><Outlet /></AppShell>;
}

const linkStyle: React.CSSProperties = { minHeight: 44, display: "flex", alignItems: "center", padding: "8px 12px", borderRadius: 12, background: "#12121a", color: "#f2f2f7", textDecoration: "none", border: "1px solid #232336" };

export function createAppRouter(bundle: RuntimeBundle): ReturnType<typeof createBrowserRouter> {
  return createBrowserRouter([
    {
      element: <Layout bundle={bundle} />,
      children: [
        { path: "/", element: <ActivityView /> },
        { path: "/chat", element: <ChatView catalog={bundle.catalog.list()} balance={0} /> },
        { path: "/wallet", element: <WalletView /> },
        { path: "/economy", element: <EconomySimulator /> },
      ],
    },
  ]);
}

export function App({ bundle }: { bundle: RuntimeBundle }): React.ReactElement {
  const router = React.useMemo(() => createAppRouter(bundle), [bundle]);
  return <RouterProvider router={router} />;
}
