import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { AdvertiserClient, type AdvertiserSnapshot } from './runtime/AdvertiserClient';

type SectionProps = { title: string; copy: string; value: string; action: string };

function Section({ title, copy, value, action }: SectionProps): ReactElement {
  return <section className="advertiser-panel" aria-labelledby={`${title}-heading`}>
    <div><h2 id={`${title}-heading`}>{title}</h2><p>{copy}</p><strong>{value}</strong></div>
    <span className="panel-action" aria-hidden="true">{action} →</span>
  </section>;
}

function AccessForm({ onSubmit }: { onSubmit: (token: string) => void }): ReactElement {
  const [token, setToken] = useState('');
  return <form className="access-form" onSubmit={(event: FormEvent<HTMLFormElement>) => { event.preventDefault(); onSubmit(token.trim()); }}>
    <label htmlFor="advertiser-token">API key de campañas</label>
    <div className="access-row"><input id="advertiser-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Pega la clave emitida por Studio" autoComplete="off" required /><button type="submit">Cargar datos</button></div>
    <small>La clave vive solo en esta sesión del navegador.</small>
  </form>;
}

function CampaignForm({ client, onCreated }: { client: AdvertiserClient; onCreated: () => void }): ReactElement {
  const [name, setName] = useState('');
  const [budgetMicro, setBudgetMicro] = useState('');
  const [label, setLabel] = useState('Sponsored');
  const [error, setError] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setError(''); void client.createCampaign({ name: name.trim(), budgetMicro: budgetMicro.trim(), sponsoredLabel: label.trim() }).then(() => { setName(''); setBudgetMicro(''); onCreated(); }).catch((reason: Error) => setError(reason.message)); };
  return <section className="campaign-form" aria-labelledby="new-campaign-heading"><h2 id="new-campaign-heading">Nueva campaña</h2><form onSubmit={submit}><label htmlFor="campaign-name">Nombre</label><input id="campaign-name" value={name} onChange={(event) => setName(event.target.value)} required /><label htmlFor="campaign-budget">Presupuesto (micro USD)</label><input id="campaign-budget" inputMode="numeric" pattern="[0-9]+" value={budgetMicro} onChange={(event) => setBudgetMicro(event.target.value)} required /><label htmlFor="campaign-label">Etiqueta patrocinada</label><input id="campaign-label" value={label} onChange={(event) => setLabel(event.target.value)} required /><button type="submit">Crear borrador</button>{error ? <p role="alert" className="error">{error}</p> : null}</form></section>;
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
  const [token, setToken] = useState(accessToken);
  const [error, setError] = useState('Sesión requerida');
  const client = new AdvertiserClient(apiBaseUrl, token);
  const load = () => { setError(''); void client.load().then(setSnapshot).catch((reason: Error) => { setSnapshot(undefined); setError(reason.message); }); };
  useEffect(() => { if (token) load(); }, [token, apiBaseUrl]);
  return <div className="advertiser-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header><span className="brand">RouterGo Ads Manager</span><span className="status">{snapshot ? 'Datos cargados' : 'Acceso bloqueado'}</span></header>
    <main id="main"><h1>Centro del anunciante</h1><p className="intro">Gestiona fondos, campañas y resultados de tu organización.</p>
      {!token ? <AccessForm onSubmit={setToken} /> : null}
      {snapshot ? <><LoadedView snapshot={snapshot} /><CampaignForm client={client} onCreated={load} /></> : <p role="alert" className="error">{error}. Introduce una API key con alcance de campañas para continuar.</p>}
    </main>
  </div>;
}
