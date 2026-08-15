import type { DesignToken, RuntimeManifest, TokenType } from "./types";

type TokenSpec = { type: TokenType; cssVariable: string };

const TOKEN_SPECS: Record<string, TokenSpec> = {
  "color.bg": { type: "color", cssVariable: "--rg-color-bg" },
  "color.surface": { type: "color", cssVariable: "--rg-color-surface" },
  "color.surface-muted": { type: "color", cssVariable: "--rg-color-surface-muted" },
  "color.brand": { type: "color", cssVariable: "--rg-color-brand" },
  "color.brand-soft": { type: "color", cssVariable: "--rg-color-brand-soft" },
  "color.success": { type: "color", cssVariable: "--rg-color-success" },
  "color.warning": { type: "color", cssVariable: "--rg-color-warning" },
  "color.danger": { type: "color", cssVariable: "--rg-color-danger" },
  "color.text-primary": { type: "color", cssVariable: "--rg-color-text-primary" },
  "color.text-secondary": { type: "color", cssVariable: "--rg-color-text-secondary" },
  "color.text-disabled": { type: "color", cssVariable: "--rg-color-text-disabled" },
  "spacing.4": { type: "dimension", cssVariable: "--rg-spacing-4" },
  "spacing.8": { type: "dimension", cssVariable: "--rg-spacing-8" },
  "spacing.16": { type: "dimension", cssVariable: "--rg-spacing-16" },
  "font.sans": { type: "fontFamily", cssVariable: "--rg-font-sans" },
  "radius.md": { type: "dimension", cssVariable: "--rg-radius-md" },
};

export class DesignTokenRegistry {
  private readonly accepted: DesignToken[];
  readonly version: number;

  constructor(manifest: RuntimeManifest) {
    this.accepted = manifest.tokens.filter(isSafeToken);
    this.version = manifest.manifest_version;
  }

  toCssVariables(): Record<string, string> {
    return Object.fromEntries(this.accepted.map((token) => [TOKEN_SPECS[token.token_key].cssVariable, token.token_value]));
  }

  applyToRoot(): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    for (const [key, value] of Object.entries(this.toCssVariables())) root.style.setProperty(key, value);
    root.dataset.themeVersion = String(this.version);
  }

  get(key: string): string | undefined {
    return this.accepted.find((token) => token.token_key === key)?.token_value;
  }

  list(): DesignToken[] { return [...this.accepted]; }
}

function isSafeToken(token: DesignToken): boolean {
  const spec = TOKEN_SPECS[token.token_key];
  return Boolean(spec && spec.type === token.token_type && safeValue(token.token_type, token.token_value));
}

function safeValue(type: TokenType, value: string): boolean {
  if (!value || /[;{}]|url\s*\(|expression\s*\(/i.test(value)) return false;
  if (type === "color") return /^#[0-9a-f]{3,8}$/i.test(value) || /^(?:rgb|hsl)a?\([^)]*\)$/i.test(value);
  if (type === "dimension") return /^(?:0|\d+(?:\.\d+)?)(?:px|rem|em|%|vh|vw|dvh|dvw)?$/.test(value);
  if (type === "fontFamily") return /^[a-z0-9 ,.'-]+$/i.test(value);
  return /^[a-z0-9 _(),.%#-]+$/i.test(value);
}
