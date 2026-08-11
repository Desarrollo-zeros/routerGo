export const primitiveTokens = {
  // Colors - Dark theme base
  "primitive.color.ink": "#08080d",
  "primitive.color.surface": "#0f0f17",
  "primitive.color.surfaceMuted": "#16161f",
  "primitive.color.surfaceElevated": "#1c1c28",
  
  // Brand - Purple/Violet palette
  "primitive.color.brand": "#8b5cf6",
  "primitive.color.brandDark": "#6d28d9",
  "primitive.color.brandLight": "#a78bfa",
  "primitive.color.brandGlow": "rgba(139, 92, 246, 0.4)",
  
  // Accents
  "primitive.color.success": "#22c55e",
  "primitive.color.warning": "#f59e0b",
  "primitive.color.danger": "#ef4444",
  "primitive.color.info": "#3b82f6",
  
  // Text
  "primitive.color.textPrimary": "#f8fafc",
  "primitive.color.textSecondary": "#94a3b8",
  "primitive.color.textMuted": "#64748b",
  "primitive.color.textDisabled": "#475569",
  
  // Borders
  "primitive.color.border": "rgba(139, 92, 246, 0.15)",
  "primitive.color.borderStrong": "rgba(139, 92, 246, 0.3)",
  
  // Gradients
  "primitive.gradient.brand": "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
  "primitive.gradient.brandLight": "linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)",
  "primitive.gradient.surface": "linear-gradient(180deg, #0f0f17 0%, #08080d 100%)",
  
  // Glows
  "primitive.glow.brand": "0 0 20px rgba(139, 92, 246, 0.5)",
  "primitive.glow.brandSoft": "0 0 40px rgba(139, 92, 246, 0.3)",
  "primitive.glow.success": "0 0 15px rgba(34, 197, 94, 0.4)",
  
  // Spacing
  "primitive.space.1": "4px",
  "primitive.space.2": "8px",
  "primitive.space.3": "12px",
  "primitive.space.4": "16px",
  "primitive.space.5": "20px",
  "primitive.space.6": "24px",
  "primitive.space.8": "32px",
  "primitive.space.10": "40px",
  "primitive.space.12": "48px",
  
  // Border radius
  "primitive.radius.sm": "8px",
  "primitive.radius.md": "12px",
  "primitive.radius.lg": "16px",
  "primitive.radius.xl": "24px",
  "primitive.radius.full": "9999px",
  
  // Shadows
  "primitive.shadow.sm": "0 1px 2px rgba(0, 0, 0, 0.5)",
  "primitive.shadow.md": "0 4px 12px rgba(0, 0, 0, 0.6)",
  "primitive.shadow.lg": "0 8px 24px rgba(0, 0, 0, 0.7)",
} as const;

export const semanticTokens = {
  // Backgrounds
  "semantic.bg": "var(--rg-primitive-color-ink)",
  "semantic.bgSurface": "var(--rg-primitive-color-surface)",
  "semantic.bgMuted": "var(--rg-primitive-color-surfaceMuted)",
  "semantic.bgElevated": "var(--rg-primitive-color-surfaceElevated)",
  
  // Brand
  "semantic.brand": "var(--rg-primitive-color-brand)",
  "semantic.brandDark": "var(--rg-primitive-color-brandDark)",
  "semantic.brandLight": "var(--rg-primitive-color-brandLight)",
  "semantic.brandGlow": "var(--rg-primitive-color-brandGlow)",
  
  // Text
  "semantic.text": "var(--rg-primitive-color-textPrimary)",
  "semantic.textSecondary": "var(--rg-primitive-color-textSecondary)",
  "semantic.textMuted": "var(--rg-primitive-color-textMuted)",
  
  // Borders
  "semantic.border": "var(--rg-primitive-color-border)",
  "semantic.borderStrong": "var(--rg-primitive-color-borderStrong)",
  
  // Gradients
  "semantic.gradient.brand": "var(--rg-primitive-gradient-brand)",
  "semantic.gradient.brandLight": "var(--rg-primitive-gradient-brandLight)",
  
  // Glows
  "semantic.glow.brand": "var(--rg-primitive-glow-brand)",
  "semantic.glow.brandSoft": "var(--rg-primitive-glow-brandSoft)",
} as const;

export const componentTokens = {
  // Card
  "component.card.bg": "var(--rg-primitive-color-surface)",
  "component.card.border": "var(--rg-primitive-color-border)",
  "component.card.radius": "var(--rg-primitive-radius-lg)",
  
  // Button Primary
  "component.button.primary.bg": "var(--rg-primitive-gradient-brand)",
  "component.button.primary.text": "#ffffff",
  "component.button.primary.glow": "var(--rg-primitive-glow-brand)",
  
  // Stats
  "component.stat.bg": "var(--rg-primitive-color-surfaceMuted)",
  "component.stat.border": "var(--rg-primitive-color-border)",
  "component.stat.value.color": "var(--rg-primitive-color-brand)",
  
  // Balance
  "component.balance.bg": "var(--rg-primitive-color-surfaceMuted)",
  "component.balance.icon": "var(--rg-primitive-color-brand)",
  
  // Sponsor
  "component.sponsor.bg": "var(--rg-primitive-color-surface)",
  "component.sponsor.border": "var(--rg-primitive-color-border)",
} as const;

export function injectFallbackTokens(): void {
  const root = document.documentElement;
  const all = { ...primitiveTokens, ...semanticTokens, ...componentTokens };
  for (const [k, v] of Object.entries(all)) {
    const cssVar = `--rg-${k.replace(/\./g, "-")}`;
    if (!root.style.getPropertyValue(cssVar)) {
      root.style.setProperty(cssVar, v);
    }
  }
}
