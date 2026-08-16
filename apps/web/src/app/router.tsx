import React from "react";
import { createBrowserRouter, Link, Outlet, RouterProvider, useLocation } from "react-router-dom";
import { AppShell } from "../design-system/AppShell";
import { CreditBalance } from "../design-system/CreditBalance";
import type { RuntimeBundle } from "../runtime/bootstrap";
import { useRuntime } from "../runtime/RuntimeProvider";
import type { NavigationItem } from "../runtime/NavigationRegistry";

function Layout({ bundle }: { bundle: RuntimeBundle }): React.ReactElement {
  const [balance, setBalance] = React.useState(0);
  const items = visibleItems(bundle);
  React.useEffect(() => {
    void bundle.api.request<{ balance: number }>({ routeKey: "wallet-get" }).then((wallet) => setBalance(wallet.balance)).catch(() => undefined);
  }, [bundle]);
  const nav = <RuntimeNavigation items={items} />;
  return <AppShell header={<CreditBalance balance={balance} />} nav={nav}><Outlet /></AppShell>;
}

function RuntimeNavigation({ items }: { items: NavigationItem[] }): React.ReactElement {
  const location = useLocation();
  return (
    <div className="rg-nav-list">
      <Link className="rg-brand" to="/">RouterGo</Link>
      {items.map((item) => {
        const current = location.pathname === item.path;
        return <Link key={item.route_key} className="rg-nav-link" to={item.path} aria-current={current ? "page" : undefined} data-route-key={item.route_key}>{item.label}</Link>;
      })}
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
