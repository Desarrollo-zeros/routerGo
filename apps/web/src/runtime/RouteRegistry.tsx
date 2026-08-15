import React from "react";
import { ActivityView } from "../features/activity/ActivityView";
import { ChatView } from "../features/chat/ChatView";
import { EconomySimulator } from "../features/economy/EconomySimulator";
import { WalletView } from "../features/wallet/WalletView";
import type { CatalogRegistry } from "./CatalogRegistry";
import type { HttpApiPort } from "./ApiPort";
import type { NavItem } from "./types";

export type ScreenContext = { catalog: CatalogRegistry; api: HttpApiPort };
export type ScreenDefinition = {
  screenKey: string;
  path: string;
  available: boolean;
  render: (context: ScreenContext) => React.ReactElement;
};

const NOT_AVAILABLE: ScreenDefinition = {
  screenKey: "not-available",
  path: "/not-available",
  available: false,
  render: () => <NotAvailableScreen />,
};

const SCREEN_REGISTRY = new Map<string, ScreenDefinition>([
  ["activity", { screenKey: "activity", path: "/", available: true, render: ({ api }) => <ActivityView api={api} /> }],
  ["chat", { screenKey: "chat", path: "/chat", available: true, render: ({ catalog, api }) => <ChatView catalog={catalog.list()} balance={0} api={api} /> }],
  ["wallet", { screenKey: "wallet", path: "/wallet", available: true, render: ({ api }) => <WalletView api={api} /> }],
  ["admin-economy", { screenKey: "admin-economy", path: "/economy", available: true, render: () => <EconomySimulator /> }],
]);

export class RouteRegistry {
  resolve(screenKey: string): ScreenDefinition {
    return SCREEN_REGISTRY.get(screenKey) ?? NOT_AVAILABLE;
  }

  uiRoutes(items: NavItem[], context: ScreenContext): Array<{ path: string; element: React.ReactElement }> {
    return items.flatMap((item) => {
      const screen = this.resolve(item.screen_key);
      return screen.available ? [{ path: screen.path, element: screen.render(context) }] : [];
    });
  }
}

function NotAvailableScreen(): React.ReactElement {
  return (
    <section className="rg-runtime-unavailable" role="status">
      <h1>Vista no disponible</h1>
      <p>Esta configuración todavía no tiene una pantalla compilada.</p>
    </section>
  );
}
