import React from "react";
import type { WebRuntimeManifest } from "@routergo/shared";
import { AdminShell } from "../design-system/AdminShell";
import { Panel, StatusMessage } from "../design-system/Primitives";
import { ModelCatalogView } from "../features/catalog/ModelCatalogView";
import { ProviderView } from "../features/providers/ProviderView";
import { RuntimeConfigView } from "../features/runtime/RuntimeConfigView";
import { LedgerReadView } from "../features/economy/LedgerReadView";
import { WalletReadView } from "../features/economy/WalletReadView";
import { UnitEconomicsDashboard } from "../features/economy/UnitEconomicsDashboard";
import { RuntimeNavigation } from "../features/navigation/RuntimeNavigation";
import { HttpAdminEconomyClient, type AdminEconomySummary } from "../runtime/AdminEconomyClient";
import { HttpAdminLedgerClient, type AdminLedgerSummary } from "../runtime/AdminLedgerClient";
import { HttpAdminRuntimeClient } from "../runtime/AdminRuntimeClient";
import { HttpAdminWalletClient, type AdminWalletSummary } from "../runtime/AdminWalletClient";
import { ChallengeBuilderView } from "../features/challenges/ChallengeBuilderView";

interface AdminAppProps {
  manifest?: WebRuntimeManifest;
  economyAccessToken?: string;
}

export function AdminApp({ manifest, economyAccessToken }: AdminAppProps): React.ReactElement {
  const reads = useAdminReads(economyAccessToken);
  const publishRuntime = usePublishRuntime(economyAccessToken);
  return <AdminShell brand={<span aria-label="RouterGo Studio">RouterGo Studio</span>} navigation={manifest ? <RuntimeNavigation manifest={manifest} /> : undefined}>
    <h1>Studio</h1>
    {manifest ? <div className="admin-stack"><RuntimeConfigView manifest={manifest} onPublish={publishRuntime} /><ChallengeBuilderView accessToken={economyAccessToken} /><ModelCatalogView models={manifest.catalog} /><ProviderView models={manifest.catalog} /><WalletReadView authorized={Boolean(reads.wallet)} summary={reads.wallet} /><UnitEconomicsDashboard authorized={Boolean(reads.economy)} summary={reads.economy?.unitEconomics} /><LedgerReadView authorized={Boolean(reads.ledger)} rows={reads.ledger?.entries} /></div> : <Panel title="Área de administración"><StatusMessage>La configuración runtime no está disponible.</StatusMessage></Panel>}
  </AdminShell>;
}

function usePublishRuntime(accessToken?: string): (() => void) | undefined {
  return React.useMemo(() => {
    if (!accessToken?.trim()) return undefined;
    return () => { void new HttpAdminRuntimeClient().publish(accessToken, crypto.randomUUID()).then(() => window.location.reload()); };
  }, [accessToken]);
}

interface AdminReadState {
  economy?: AdminEconomySummary;
  wallet?: AdminWalletSummary;
  ledger?: AdminLedgerSummary;
}

function useAdminReads(accessToken?: string): AdminReadState {
  const [reads, setReads] = React.useState<AdminReadState>({});
  React.useEffect(() => {
    if (!accessToken?.trim()) { setReads({}); return; }
    let active = true;
    const update = <K extends keyof AdminReadState>(key: K, value: AdminReadState[K]) => { if (active) setReads((current) => ({ ...current, [key]: value })); };
    void new HttpAdminEconomyClient().read(accessToken).then((value) => update('economy', value)).catch(() => undefined);
    void new HttpAdminWalletClient().read(accessToken).then((value) => update('wallet', value)).catch(() => undefined);
    void new HttpAdminLedgerClient().read(accessToken).then((value) => update('ledger', value)).catch(() => undefined);
    return () => { active = false; };
  }, [accessToken]);
  return reads;
}
