import { describe, expect, it } from "vitest";
import { CatalogRegistry } from "./CatalogRegistry";
import { DesignTokenRegistry } from "./DesignTokenRegistry";
import { FeatureFlagRegistry } from "./FeatureFlagRegistry";
import { NavigationRegistry } from "./NavigationRegistry";
import { RouteRegistry } from "./RouteRegistry";
import { RouteResolver } from "./RouteResolver";
import { ManifestValidationError, parseRuntimeManifest, type RuntimeManifest } from "./types";
import { HttpApiPort } from "./ApiPort";

const base: RuntimeManifest = {
  version: 2,
  contentHash: "a".repeat(64),
  apiRoutes: [apiRoute("activity-verify"), apiRoute("quote-create"), apiRoute("wallet-get")],
  ui: {
    routes: [uiRoute("activity-verify", "/"), uiRoute("quote-create", "/chat"), uiRoute("wallet-get", "/wallet")],
    navigation: [nav("activity-verify", "activity", 2), nav("quote-create", "chat", 1), nav("wallet-get", "wallet", 3)],
  },
  catalog: [{ logical_id: "model-1", provider_model_id: "provider-1", gateway_id: "gateway-1", tier: "FREE", credit_price: 1, enabled: true, capabilities: {}, limits: {} }],
  tokens: [token("color.bg", "#101018"), token("color.brand", "#6c5ce7")],
  featureFlags: { chat_enabled: true },
};

function apiRoute(routeKey: string): RuntimeManifest["apiRoutes"][number] {
  return { route_key: routeKey, method: "POST", path_template: `/${routeKey}`, version: "v1", use_case_key: routeKey, auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true };
}

function uiRoute(routeKey: string, path: string): RuntimeManifest["ui"]["routes"][number] {
  return { route_key: routeKey, path, screen_key: routeKey === "activity-verify" ? "activity" : routeKey === "quote-create" ? "chat" : "wallet", enabled: true };
}

function nav(routeKey: string, screenKey: string, order: number, featureFlag: string | null = null): RuntimeManifest["ui"]["navigation"][number] {
  return { route_key: routeKey, screen_key: screenKey, label_key: `nav.${screenKey}`, icon_key: null, order_index: order, required_capability: null, feature_flag: featureFlag, enabled: true };
}

function token(key: string, value: string): RuntimeManifest["tokens"][number] {
  return { theme: "default", token_key: key, token_type: key.startsWith("color.") ? "color" : "dimension", token_value: value, contrast_pair: null, mode: "dark", enabled: true };
}

describe("runtime manifest consumption", () => {
  it("validates the canonical public projection and rejects malformed payloads", () => {
    expect(parseRuntimeManifest(base)).toEqual(base);
    expect(() => parseRuntimeManifest({ ...base, version: 0 })).toThrow(ManifestValidationError);
    expect(() => parseRuntimeManifest({ ...base, ui: { ...base.ui, navigation: [{ ...base.ui.navigation[0], route_key: "missing" }] } })).toThrow(ManifestValidationError);
  });

  it("orders navigation from UI routes and filters disabled or flagged entries", () => {
    const manifest = { ...base, ui: { ...base.ui, navigation: [nav("wallet-get", "wallet", 3), nav("activity-verify", "activity", 1), nav("quote-create", "chat", 2, "chat_enabled")] } };
    const flags = new FeatureFlagRegistry(manifest);
    const registry = new NavigationRegistry(manifest, flags);
    expect(registry.list().map((item) => item.screen_key)).toEqual(["activity", "chat", "wallet"]);
    const hidden = { ...manifest, featureFlags: { chat_enabled: false } };
    expect(new NavigationRegistry(hidden, new FeatureFlagRegistry(hidden)).list().map((item) => item.screen_key)).toEqual(["activity", "wallet"]);
  });

  it("uses false for unknown flags, unresolved labels, and capabilities", () => {
    const manifest = { ...base, ui: { ...base.ui, navigation: [nav("activity-verify", "activity", 1, "unknown"), { ...nav("wallet-get", "wallet", 2), label_key: "unknown.label", required_capability: "runtime.publish" }] } };
    const flags = new FeatureFlagRegistry(manifest);
    expect(flags.isEnabled("unknown")).toBe(false);
    expect(new NavigationRegistry(manifest, flags).list()).toHaveLength(0);
  });

  it("resolves only compiled screens and uses the manifest UI path", () => {
    const registry = new RouteRegistry();
    expect(registry.resolve("activity", "/activity").available).toBe(true);
    expect(registry.resolve("remote-code", "/remote").available).toBe(false);
    const items = new NavigationRegistry(base, new FeatureFlagRegistry(base)).list();
    expect(registry.uiRoutes(items, { catalog: new CatalogRegistry(base), api: new HttpApiPort(null) })).toHaveLength(3);
  });

  it("ignores unknown and unsafe design tokens", () => {
    const manifest = { ...base, tokens: [token("color.bg", "#101018"), token("unknown.key", "#ffffff"), token("color.brand", "url(javascript:bad)")] };
    const registry = new DesignTokenRegistry(manifest);
    expect(registry.toCssVariables()).toEqual({ "--rg-color-bg": "#101018" });
  });

  it("keeps API routes separate from UI navigation", () => {
    const routes = new RouteResolver(base);
    expect(routes.pathFor("wallet-get")).toBe("/wallet-get");
    expect(new NavigationRegistry(base, new FeatureFlagRegistry(base)).list().map((item) => item.path)).toEqual(["/chat", "/", "/wallet"]);
  });
});
