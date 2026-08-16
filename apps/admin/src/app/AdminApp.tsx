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
import { HttpAdminRuntimeClient } from "../runtime/AdminRuntimeClient";

interface AdminAppProps {
  manifest?: WebRuntimeManifest;
  economyAccessToken?: string;
}

export function AdminApp({ manifest, economyAccessToken }: AdminAppProps): React.ReactElement {
  const economy = useAdminEconomy(economyAccessToken);
  const publishRuntime = usePublishRuntime(economyAccessToken);
  return <AdminShell brand={<span aria-label="RouterGo Studio">RouterGo Studio</span>} navigation={manifest ? <RuntimeNavigation manifest={manifest} /> : undefined}>
    <h1>Studio</h1>
    {manifest ? <div className="admin-stack"><RuntimeConfigView manifest={manifest} onPublish={publishRuntime} /><ModelCatalogView models={manifest.catalog} /><ProviderView models={manifest.catalog} /><UnitEconomicsDashboard authorized={Boolean(economy)} summary={economy?.unitEconomics} /><EconomyReadView authorized={false} /><LedgerReadView authorized={false} /></div> : <Panel title="Área de administración"><StatusMessage>La configuración runtime no está disponible.</StatusMessage></Panel>}
  </AdminShell>;
}

function usePublishRuntime(accessToken?: string): (() => void) | undefined {
  return React.useMemo(() => {
    if (!accessToken?.trim()) return undefined;
    return () => { void new HttpAdminRuntimeClient().publish(accessToken, crypto.randomUUID()).then(() => window.location.reload()); };
  }, [accessToken]);
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
