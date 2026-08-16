import React from "react";
import { createBrowserRouter, Link, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { AppShell } from "../design-system/AppShell";
import { CreditBalance } from "../design-system/CreditBalance";
import type { RuntimeBundle } from "../runtime/bootstrap";
import { useRuntime } from "../runtime/RuntimeProvider";
import type { NavigationItem } from "../runtime/NavigationRegistry";
import { NavIcon } from "../design-system/NavIcon";

function Layout({ bundle }: { bundle: RuntimeBundle }): React.ReactElement {
  const [balance, setBalance] = React.useState(0);
  const items = visibleItems(bundle);
  React.useEffect(() => {
    void bundle.api.request<{ balance: number }>({ routeKey: "wallet-get" }).then((wallet) => setBalance(wallet.balance)).catch(() => undefined);
  }, [bundle]);
  const nav = <RuntimeNavigation items={items} />;
  return <AppShell header={<RuntimeHeader balance={balance} />} nav={nav}><Outlet /></AppShell>;
}

function RuntimeHeader({ balance }: { balance: number }): React.ReactElement {
  const logout = async (): Promise<void> => { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); window.location.reload(); };
  return <div className="rg-topbar"><Link to="/" className="rg-topbar-brand"><span className="rg-mark">R</span><span>RouterGo</span></Link><div className="rg-topbar-actions"><CreditBalance balance={balance} label="GoCredits" /><button className="rg-logout" onClick={() => void logout()}>Salir</button></div></div>;
}

function RuntimeNavigation({ items }: { items: NavigationItem[] }): React.ReactElement {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const primary = items.slice(0, 5);
  const secondary = items.slice(5);
  const renderLink = (item: NavigationItem): React.ReactElement => {
    const current = location.pathname === item.path;
    return <Link key={item.route_key} className="rg-nav-link" to={item.path} aria-current={current ? "page" : undefined} data-route-key={item.route_key} onClick={() => setMoreOpen(false)}><NavIcon iconKey={item.icon_key} /><span>{item.label}</span></Link>;
  };
  return (
    <div className="rg-nav-list">
      <p className="rg-nav-title">Tu espacio</p>
      <div className="rg-nav-primary">{primary.map(renderLink)}</div>
      {secondary.length > 0 ? <div className="rg-nav-secondary"><button type="button" className="rg-more-toggle" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}><span className="rg-more-icon" aria-hidden="true">•••</span><span>Más</span></button>{moreOpen ? <div className="rg-more-menu">{secondary.map(renderLink)}</div> : null}</div> : null}
    </div>
  );
}

function visibleItems(bundle: RuntimeBundle): NavigationItem[] {
  return bundle.navigation.list().filter((item) => bundle.screens.resolve(item.screen_key, item.path).available);
}

export function createAppRouter(bundle: RuntimeBundle): ReturnType<typeof createBrowserRouter> {
  const items = visibleItems(bundle);
  const routes = bundle.screens.uiRoutes(items, { catalog: bundle.catalog, api: bundle.api });
  return createBrowserRouter([{
    element: <Layout bundle={bundle} />,
    children: [...routes, { path: "*", element: <NotAvailableRoute /> }],
  }]);
}

function NotAvailableRoute(): React.ReactElement {
  return <section className="rg-runtime-unavailable" role="status"><h1>Vista no disponible</h1><p>Esta ruta no está activa en la configuración actual.</p></section>;
}

export function App({ bundle: provided }: { bundle?: RuntimeBundle } = {}): React.ReactElement {
  const runtime = useRuntime();
  const bundle = provided ?? runtime.bundle;
  const router = React.useMemo(() => createAppRouter(bundle), [bundle]);
  return <RouterProvider router={router} />;
}
