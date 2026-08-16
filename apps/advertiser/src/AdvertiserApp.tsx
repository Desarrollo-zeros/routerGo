import { useEffect, useState, type ReactElement } from 'react';
import { AdvertiserClient, type AdvertiserSnapshot } from './runtime/AdvertiserClient';

type SectionProps = { title: string; copy: string; value: string; action: string };

function Section({ title, copy, value, action }: SectionProps): ReactElement {
  return <section className="advertiser-panel" aria-labelledby={`${title}-heading`}>
    <div><h2 id={`${title}-heading`}>{title}</h2><p>{copy}</p><strong>{value}</strong></div>
    <button type="button" disabled title="Las mutaciones requieren un flujo autenticado">{action}</button>
  </section>;
}

function LoadedView({ snapshot }: { snapshot: AdvertiserSnapshot }): ReactElement {
  return <div className="advertiser-grid">
    <Section title="Balance" copy="Saldo USD de la cuenta publicitaria." value={`${snapshot.account.balanceMicro} ${snapshot.account.currency}`} action="Ver balance" />
    <Section title="Campañas" copy="Campañas aisladas por organización." value={`${snapshot.campaigns.length} registradas`} action="Gestionar campañas" />
    <Section title="Creatividades" copy="Piezas vinculadas a campañas." value={`${snapshot.creatives.length} registradas`} action="Gestionar creatividades" />
    <Section title="Analítica" copy="Eventos de entrega reconciliados." value={`${snapshot.analytics.impressions} impresiones · ${snapshot.analytics.clicks} clics`} action="Ver analítica" />
  </div>;
}

export function AdvertiserApp({ accessToken, apiBaseUrl = '' }: { accessToken?: string; apiBaseUrl?: string }): ReactElement {
  const [snapshot, setSnapshot] = useState<AdvertiserSnapshot>();
  const [error, setError] = useState('Sesión requerida');
  useEffect(() => { new AdvertiserClient(apiBaseUrl, accessToken).load().then(setSnapshot).catch((reason: Error) => setError(reason.message)); }, [accessToken, apiBaseUrl]);
  return <div className="advertiser-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header><span className="brand">RouterGo Ads Manager</span><span className="status">{snapshot ? 'Datos cargados' : 'Acceso bloqueado'}</span></header>
    <main id="main"><h1>Centro del anunciante</h1><p className="intro">Gestiona fondos, campañas y resultados de tu organización.</p>
      {snapshot ? <LoadedView snapshot={snapshot} /> : <p role="alert" className="error">{error}. Las acciones permanecen deshabilitadas.</p>}
    </main>
  </div>;
}
