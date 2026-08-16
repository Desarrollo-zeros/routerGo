import React from "react";

type Props = { onAuthenticated: (email: string) => void };

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

  return (
    <main className="rg-auth-page">
      <div className="rg-auth-brand"><span className="rg-mark">R</span><strong>RouterGo</strong></div>
      <section className="rg-auth-layout">
        <div className="rg-auth-intro">
          <p className="rg-auth-kicker">Esfuerzo que se convierte en acceso</p>
          <h1>Entrena. Gana GoCredits. Usa IA al instante.</h1>
          <p>Tu progreso abre modelos, herramientas y conversaciones sin perder de vista lo que gastas.</p>
          <div className="rg-auth-points"><span>01 · Verifica tu esfuerzo</span><span>02 · Recibe GoCredits</span><span>03 · Elige cómo usarlos</span></div>
        </div>
        <form className="rg-auth-card" onSubmit={submit}>
          <div className="rg-auth-tabs" role="tablist" aria-label="Acceso a RouterGo">
            <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "is-active" : ""} onClick={() => { setMode("login"); setError(undefined); }}>Iniciar sesión</button>
            <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "is-active" : ""} onClick={() => { setMode("register"); setError(undefined); }}>Crear cuenta</button>
          </div>
          <h2>{mode === "login" ? "Vuelve a tu progreso" : "Empieza tu cuenta"}</h2>
          <p className="rg-auth-card-copy">{mode === "login" ? "Continúa donde lo dejaste." : "Solo necesitamos lo esencial para comenzar."}</p>
          <label htmlFor="auth-email">Correo electrónico</label>
          <input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="auth-password">Contraseña</label>
            <input id="auth-password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          {error ? <p className="rg-auth-error" role="alert">{error}</p> : null}
          <button className="rg-auth-submit" type="submit" disabled={submitting}>{submitting ? "Conectando…" : mode === "login" ? "Entrar a RouterGo" : "Crear mi cuenta"}</button>
          <p className="rg-auth-legal">Al continuar aceptas las reglas de uso y el tratamiento mínimo necesario para tu cuenta.</p>
        </form>
      </section>
      <p className="rg-auth-footer">GoCredits no son dinero ni tokens del proveedor. Son el saldo interno de RouterGo.</p>
    </main>
  );
}

function authMessage(code: string | undefined): string {
  if (code === "invalid_credentials") return "Correo o contraseña incorrectos.";
  if (code === "email_already_registered") return "Este correo ya tiene una cuenta. Inicia sesión.";
  if (code === "WeakPassword") return "La contraseña debe tener al menos 8 caracteres.";
  return "No se pudo completar el acceso. Inténtalo de nuevo.";
}
