import React from "react";

type Props = { onAuthenticated: (email: string) => void };
type SocialProvider = "google" | "github";

const socialUrls: Record<SocialProvider, string | undefined> = {
  google: import.meta.env.VITE_GOOGLE_OAUTH_URL || undefined,
  github: import.meta.env.VITE_GITHUB_OAUTH_URL || undefined,
};

export function AuthView({ onAuthenticated }: Props): React.ReactElement {
  const [mode, setMode] = React.useState<"login" | "register">("login");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!email.includes("@") || password.length < 8) {
      setError("Escribe un correo válido y una contraseña de al menos 8 caracteres.");
      return;
    }
    setSubmitting(true); setError(undefined);
    try {
      const response = await fetch(`/api/auth/${mode === "login" ? "login" : "register"}`, { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!response.ok) { const body = await response.json().catch(() => ({})) as { error?: string }; throw new Error(authMessage(body.error)); }
      onAuthenticated(email.trim().toLowerCase());
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo iniciar la sesión."); }
    finally { setSubmitting(false); }
  }

  function startSocial(provider: SocialProvider): void {
    const target = socialUrls[provider];
    if (target) { window.location.assign(target); return; }
    setError(`${provider === "google" ? "Google" : "GitHub"} no está configurado en este entorno. Usa correo o configura su URL OAuth.`);
  }

  return (
    <main className="rg-auth-page">
      <div className="rg-auth-topline"><div className="rg-auth-brand"><span className="rg-mark">R</span><strong>RouterGo</strong></div><a className="rg-auth-help" href="#auth-form">? <span>¿Necesitas ayuda?</span></a></div>
      <section className="rg-auth-layout">
        <div className="rg-auth-intro">
          <p className="rg-auth-kicker">Tu esfuerzo te abre el camino</p>
          <h1>Entrena. Gana<br /><span>GoCredits.</span> Usa<br />IA al instante. 💪</h1>
          <p>Completa actividades, construye tu progreso y convierte tu esfuerzo en GoCredits para usarlos al instante.</p>
          <div className="rg-auth-coin-art" aria-hidden="true"><span className="rg-auth-coin rg-auth-coin-back" /><span className="rg-auth-coin rg-auth-coin-mid" /><span className="rg-auth-coin rg-auth-coin-front">G</span><i /></div>
          <div className="rg-auth-points"><article><b>1</b><span>✓</span><div><strong>Verifica tu esfuerzo</strong><p>Actividades y ejercicios validan tu compromiso.</p></div></article><article><b>2</b><span>G</span><div><strong>Recibe GoCredits</strong><p>Gana créditos por cada logro alcanzado.</p></div></article><article><b>3</b><span>✦</span><div><strong>Elige cómo usarlos</strong><p>Úsalos al instante en experiencias de IA.</p></div></article></div>
        </div>
        <form id="auth-form" className="rg-auth-card" onSubmit={submit}>
          <div className="rg-auth-tabs" role="tablist" aria-label="Acceso a RouterGo">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(undefined); }}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : ""} onClick={() => { setMode("register"); setError(undefined); }}>Crear cuenta</button>
          </div>
          <h2>{mode === "login" ? "¡Bienvenido de nuevo!" : "Crea tu cuenta"}</h2>
          <p className="rg-auth-card-copy">{mode === "login" ? "Inicia sesión para continuar tu camino." : "Empieza a convertir tu esfuerzo en acceso."}</p>
          <label htmlFor="auth-email">Correo electrónico</label>
          <input id="auth-email" type="email" autoComplete="email" placeholder="tucorreo@ejemplo.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="auth-password">Contraseña</label>
          <input id="auth-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="Mínimo 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          {error ? <p className="rg-auth-error" role="alert">{error}</p> : null}
          <button className="rg-auth-submit" type="submit" disabled={submitting}>{submitting ? "Conectando…" : mode === "login" ? "Entrar a RouterGo" : "Crear mi cuenta"}</button>
          <div className="rg-auth-divider"><span>o continúa con</span></div>
          <div className="rg-auth-socials"><button type="button" className="rg-auth-social" onClick={() => startSocial("google")}><SocialIcon provider="google" />Google</button><button type="button" className="rg-auth-social" onClick={() => startSocial("github")}><SocialIcon provider="github" />GitHub</button></div>
          <p className="rg-auth-legal">Al continuar aceptas las reglas de uso y el tratamiento mínimo necesario para tu cuenta.</p>
        </form>
      </section>
      <p className="rg-auth-footer">GoCredits no son dinero ni tokens del proveedor. Son el saldo interno de RouterGo.</p>
    </main>
  );
}

function SocialIcon({ provider }: { provider: SocialProvider }): React.ReactElement {
  return provider === "google" ? <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.4 3-7.3Z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.5l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.6H3.1a10 10 0 0 0 0 8.8l3.3-2.6Z" /><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8C17 3 14.7 2 12 2a10 10 0 0 0-8.9 5.6l3.3 2.6C7.2 7.8 9.4 6 12 6Z" /></svg> : <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5A3.9 3.9 0 0 1 6.6 9c-.1-.3-.5-1.3.1-2.7 0 0 .9-.3 2.8 1.1a9.6 9.6 0 0 1 5 0c1.9-1.4 2.8-1.1 2.8-1.1.6 1.4.2 2.4.1 2.7a3.9 3.9 0 0 1 1.1 2.7c0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" /></svg>;
}

function authMessage(code: string | undefined): string {
  if (code === "invalid_credentials") return "Correo o contraseña incorrectos.";
  if (code === "email_already_registered") return "Este correo ya tiene una cuenta. Inicia sesión.";
  if (code === "WeakPassword") return "La contraseña debe tener al menos 8 caracteres.";
  return "No se pudo completar el acceso. Inténtalo de nuevo.";
}
