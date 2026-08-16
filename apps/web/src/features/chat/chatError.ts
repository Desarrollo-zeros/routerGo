export function chatErrorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (text.includes("BUDGET_DENIED") || text.includes("-> 402")) return "Esta solicitud no puede ejecutarse ahora porque el presupuesto del proveedor está agotado. No se descontaron GoCredits.";
  if (text.includes("PROVIDER_EXECUTION_FAILED") || text.includes("-> 502")) return "El proveedor de IA no está disponible en este momento. No se descontaron GoCredits; prueba más tarde.";
  if (text.includes("authentication_required") || text.includes("-> 401")) return "Tu sesión expiró. Vuelve a iniciar sesión para continuar.";
  if (text.includes("RUN_ALREADY_EXECUTING")) return "Esta solicitud ya está en curso. Espera un momento antes de reintentarlo.";
  return "No se pudo completar la solicitud. No se descontaron GoCredits.";
}
