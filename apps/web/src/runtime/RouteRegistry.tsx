import React from "react";
import { ActivityView } from "../features/activity/ActivityView";
import { ChatView } from "../features/chat/ChatView";
import { EconomySimulator } from "../features/economy/EconomySimulator";
import { WalletView } from "../features/wallet/WalletView";
import { TreasureView } from "../features/treasure/TreasureView";
import { BattleView } from "../features/battle/BattleView";
import { CatalogView } from "../features/catalog/CatalogView";
import type { CatalogRegistry } from "./CatalogRegistry";
import type { HttpApiPort } from "./ApiPort";
import type { NavigationItem } from "./NavigationRegistry";

export type ScreenContext = { catalog: CatalogRegistry; api: HttpApiPort };
export type ScreenDefinition = {
  screenKey: string;
  path: string;
  available: boolean;
  render: (context: ScreenContext) => React.ReactElement;
};

const SCREEN_REGISTRY = new Map<string, ScreenDefinition>([
  ["activity", { screenKey: "activity", path: "", available: true, render: ({ api }) => <ActivityView api={api} /> }],
  ["chat", { screenKey: "chat", path: "", available: true, render: ({ catalog, api }) => <ChatView catalog={catalog.list()} balance={0} api={api} /> }],
  ["wallet", { screenKey: "wallet", path: "", available: true, render: ({ api }) => <WalletView api={api} /> }],
  ["catalog", { screenKey: "catalog", path: "", available: true, render: ({ catalog }) => <CatalogView entries={catalog.list()} /> }],
  ["admin-economy", { screenKey: "admin-economy", path: "", available: true, render: () => <EconomySimulator /> }],
  ["treasure", { screenKey: "treasure", path: "", available: true, render: () => <TreasureView hunts={[]} permission="unknown" /> }],
  ["battle", { screenKey: "battle", path: "", available: true, render: ({ api }) => <BattleView authenticated api={api} /> }],
]);

export class RouteRegistry {
  resolve(screenKey: string, path = "/not-available"): ScreenDefinition {
    const screen = SCREEN_REGISTRY.get(screenKey);
    return screen ? { ...screen, path } : notAvailable(screenKey);
  }

  uiRoutes(items: NavigationItem[], context: ScreenContext): Array<{ path: string; element: React.ReactElement }> {
    return items.flatMap((item) => {
      const screen = this.resolve(item.screen_key, item.path);
      return screen.available ? [{ path: screen.path, element: screen.render(context) }] : [];
    });
  }
}

function notAvailable(screenKey: string): ScreenDefinition {
  return { screenKey, path: "/not-available", available: false, render: () => <NotAvailableScreen /> };
}

function NotAvailableScreen(): React.ReactElement {
  return (
    <section className="rg-runtime-unavailable" role="status">
      <h1>Vista no disponible</h1>
      <p>Esta configuración todavía no tiene una pantalla compilada.</p>
    </section>
  );
}
