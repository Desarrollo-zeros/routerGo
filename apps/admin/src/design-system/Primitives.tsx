import React from "react";

export function SkipLink({ target = "#main" }: { target?: string }): React.ReactElement {
  return <a className="admin-skip" href={target}>Saltar al contenido</a>;
}

export function Button({ children, onClick, disabled = false, type = "button" }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}): React.ReactElement {
  return <button className="admin-button" type={type} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function Panel({ title, children }: { title: string; children: React.ReactNode }): React.ReactElement {
  const titleId = React.useId();
  return <section className="admin-panel" aria-labelledby={titleId}><h2 id={titleId}>{title}</h2>{children}</section>;
}

export function StatusMessage({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "error" | "success" }): React.ReactElement {
  return <p className={`admin-status admin-status-${tone}`} role={tone === "error" ? "alert" : "status"}>{children}</p>;
}
