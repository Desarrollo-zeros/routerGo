import React from "react";

type Props = { status: "loading" | "error"; onRetry?: () => void };

export function RuntimeStatusView({ status, onRetry }: Props): React.ReactElement {
  const error = status === "error";
  return (
    <main className="rg-runtime-status" aria-live="polite">
      <section className="rg-runtime-status-card" role={error ? "alert" : "status"}>
        <p className="rg-runtime-status-brand">RouterGo</p>
        <h1>{error ? "Configuración no disponible" : "Cargando configuración"}</h1>
        <p>{error ? "No podemos activar la aplicación con una configuración inválida o incompleta." : "Estamos preparando una configuración segura para esta sesión."}</p>
        {onRetry ? <button className="rg-runtime-status-action" onClick={onRetry}>Reintentar</button> : null}
      </section>
    </main>
  );
}
