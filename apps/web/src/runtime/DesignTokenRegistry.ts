import type { RuntimeManifest, DesignToken } from "./types";

function tokenToCssVar(key: string): string {
  return `--rg-${key.replace(/\./g, "-").replace(/_/g, "-")}`;
}

export class DesignTokenRegistry {
  tokens: DesignToken[];
  version: number;

  constructor(manifest: RuntimeManifest) {
    this.tokens = manifest.tokens.filter((t) => t.enabled);
    this.version = manifest.manifest_version;
  }

  toCssVariables(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const t of this.tokens) out[tokenToCssVar(t.token_key)] = t.token_value;
    return out;
  }

  applyToRoot(): void {
    const vars = this.toCssVariables();
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.dataset.themeVersion = String(this.version);
  }

  get(key: string): string | undefined {
    return this.tokens.find((t) => t.token_key === key)?.token_value;
  }

  grouped(): { primitive: DesignToken[]; semantic: DesignToken[]; component: DesignToken[] } {
    const isPrimitive = (k: string) => k.startsWith("primitive.");
    const isComponent = (k: string) => k.startsWith("component.");
    return {
      primitive: this.tokens.filter((t) => isPrimitive(t.token_key)),
      semantic: this.tokens.filter((t) => !isPrimitive(t.token_key) && !isComponent(t.token_key)),
      component: this.tokens.filter((t) => isComponent(t.token_key)),
    };
  }
}
