export const primitiveTokens = {
  "primitive.color.ink": "#0a0a0f",
  "primitive.color.surface": "#12121a",
  "primitive.color.surfaceMuted": "#1a1a26",
  "primitive.color.brand": "#7c5cff",
  "primitive.color.brandSoft": "#a99bff",
  "primitive.color.success": "#2ecc71",
  "primitive.color.warning": "#f5a623",
  "primitive.color.danger": "#ff4d6a",
  "primitive.color.textPrimary": "#f2f2f7",
  "primitive.color.textSecondary": "#a1a1b5",
  "primitive.color.textDisabled": "#6b6b80",
  "primitive.space.1": "4px",
  "primitive.space.2": "8px",
  "primitive.space.3": "12px",
  "primitive.space.4": "16px",
  "primitive.space.6": "24px",
  "primitive.radius.md": "12px",
  "primitive.radius.lg": "16px",
} as const;

export const semanticTokens = {
  "semantic.bg": "var(--rg-primitive-color-ink)",
  "semantic.surface": "var(--rg-primitive-color-surface)",
  "semantic.text": "var(--rg-primitive-color-textPrimary)",
  "semantic.brand": "var(--rg-primitive-color-brand)",
} as const;

export function injectFallbackTokens(): void {
  const root = document.documentElement;
  const all = { ...primitiveTokens, ...semanticTokens };
  for (const [k, v] of Object.entries(all)) {
    const cssVar = `--rg-${k.replace(/\./g, "-")}`;
    if (!root.style.getPropertyValue(cssVar)) root.style.setProperty(cssVar, v);
  }
}
