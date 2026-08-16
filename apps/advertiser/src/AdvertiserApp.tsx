import type { ReactElement } from 'react';

type SectionProps = { title: string; copy: string; action: string };

function Section({ title, copy, action }: SectionProps): ReactElement {
  return <section className="advertiser-panel" aria-labelledby={`${title}-heading`}>
    <div><h2 id={`${title}-heading`}>{title}</h2><p>{copy}</p></div>
    <button type="button" disabled title="Requiere sesión autenticada">{action}</button>
  </section>;
}

export function AdvertiserApp(): ReactElement {
  return <div className="advertiser-shell">
    <a className="skip-link" href="#main">Saltar al contenido</a>
    <header><span className="brand">RouterGo Ads Manager</span><span className="status">Sesión requerida</span></header>
    <main id="main"><h1>Centro del anunciante</h1><p className="intro">Gestiona fondos, campañas y resultados cuando tu organización esté autenticada.</p>
      <div className="advertiser-grid">
        <Section title="Balance" copy="El saldo USD se mostrará desde la cuenta publicitaria autorizada." action="Ver balance" />
        <Section title="Campañas" copy="Crea y revisa campañas moderadas antes de activarlas." action="Gestionar campañas" />
        <Section title="Creatividades" copy="Administra piezas vinculadas a campañas aprobadas." action="Gestionar creatividades" />
        <Section title="Analítica" copy="Consulta impresiones, clics y gasto reconciliado." action="Ver analítica" />
      </div>
    </main>
  </div>;
}
