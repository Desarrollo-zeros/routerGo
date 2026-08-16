import React from "react";
import type { WebRuntimeManifest } from "@routergo/shared";
import { AdminShell } from "../design-system/AdminShell";
import { Panel, StatusMessage } from "../design-system/Primitives";
import { ModelCatalogView } from "../features/catalog/ModelCatalogView";
import { ProviderView } from "../features/providers/ProviderView";
import { RuntimeConfigView } from "../features/runtime/RuntimeConfigView";
import { EconomyReadView } from "../features/economy/EconomyReadView";
import { LedgerReadView } from "../features/economy/LedgerReadView";
import { UnitEconomicsDashboard } from "../features/economy/UnitEconomicsDashboard";
import { RuntimeNavigation } from "../features/navigation/RuntimeNavigation";
import { HttpAdminEconomyClient, type AdminEconomySummary } from "../runtime/AdminEconomyClient";

interface AdminAppProps {
  manifest?: WebRuntimeManifest;
  economyAccessToken?: string;
}

export function AdminApp({ manifest, economyAccessToken }: AdminAppProps): React.ReactElement {
  const economy = useAdminEconomy(economyAccessToken);
  return <AdminShell brand={<span aria-label="RouterGo Studio">RouterGo Studio</span>} navigation={manifest ? <RuntimeNavigation manifest={manifest} /> : undefined}>
    <h1>Studio</h1>
    {manifest ? <div className="admin-stack"><RuntimeConfigView manifest={manifest} /><ModelCatalogView models={manifest.catalog} /><ProviderView models={manifest.catalog} /><UnitEconomicsDashboard authorized={Boolean(economy)} summary={economy?.unitEconomics} /><EconomyReadView authorized={false} /><LedgerReadView authorized={false} /></div> : <Panel title="Área de administración"><StatusMessage>La configuración runtime no está disponible.</StatusMessage></Panel>}
  </AdminShell>;
}

function useAdminEconomy(accessToken?: string): AdminEconomySummary | undefined {
  const [economy, setEconomy] = React.useState<AdminEconomySummary>();
  React.useEffect(() => {
    if (!accessToken?.trim()) { setEconomy(undefined); return; }
    let active = true;
    void new HttpAdminEconomyClient().read(accessToken).then((value) => { if (active) setEconomy(value); }).catch(() => { if (active) setEconomy(undefined); });
    return () => { active = false; };
  }, [accessToken]);
  return economy;
}
