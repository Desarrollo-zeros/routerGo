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
  manifest_version: 2,
  routes: [route("activity-verify"), route("quote-create"), route("wallet-get")],
  catalog: [{ logical_id: "model-1", provider_model_id: "provider-1", gateway_id: "gateway-1", tier: "FREE", credit_price: 1, enabled: true, capabilities: {}, limits: {} }],
  tokens: [token("color.bg", "#101018"), token("color.brand", "#6c5ce7")],
  navigation: [nav("activity-verify", "activity", 2), nav("quote-create", "chat", 1), nav("wallet-get", "wallet", 3)],
  feature_flags: { chat_enabled: true },
};

function route(routeKey: string): RuntimeManifest["routes"][number] {
  return { route_key: routeKey, method: "POST", path_template: `/${routeKey}`, version: "v1", use_case_key: routeKey, auth_policy_key: "session", request_schema_key: null, response_schema_key: null, enabled: true };
}

function nav(routeKey: string, screenKey: string, order: number, featureFlag: string | null = null): RuntimeManifest["navigation"][number] {
  return { route_key: routeKey, screen_key: screenKey, label_key: `nav.${screenKey}`, icon_key: null, order_index: order, required_capability: null, feature_flag: featureFlag, enabled: true };
}

function token(key: string, value: string): RuntimeManifest["tokens"][number] {
  return { theme: "default", token_key: key, token_type: key.startsWith("color.") ? "color" : "dimension", token_value: value, contrast_pair: null, mode: "dark", enabled: true };
}

describe("runtime manifest consumption", () => {
  it("validates the current web projection and rejects malformed payloads", () => {
    expect(parseRuntimeManifest(base)).toEqual(base);
    expect(() => parseRuntimeManifest({ ...base, manifest_version: 0 })).toThrow(ManifestValidationError);
    expect(() => parseRuntimeManifest({ ...base, navigation: [{ ...base.navigation[0], route_key: "missing" }] })).toThrow(ManifestValidationError);
  });

  it("orders navigation from manifest and filters disabled or flagged entries", () => {
    const manifest = { ...base, navigation: [nav("wallet-get", "wallet", 3), nav("activity-verify", "activity", 1), nav("quote-create", "chat", 2, "chat_enabled")] };
    const routes = new RouteResolver(manifest);
    const flags = new FeatureFlagRegistry(manifest);
    const registry = new NavigationRegistry(manifest, routes, flags);
    expect(registry.list().map((item) => item.screen_key)).toEqual(["activity", "chat", "wallet"]);
    const hidden = { ...manifest, feature_flags: { chat_enabled: false } };
    expect(new NavigationRegistry(hidden, new RouteResolver(hidden), new FeatureFlagRegistry(hidden)).list().map((item) => item.screen_key)).toEqual(["activity", "wallet"]);
  });

  it("uses false for unknown flags and deny-by-default capabilities", () => {
    const manifest = { ...base, navigation: [{ ...base.navigation[0], required_capability: "runtime.publish" }, nav("wallet-get", "wallet", 2, "unknown")] };
    const flags = new FeatureFlagRegistry(manifest);
    expect(flags.isEnabled("unknown")).toBe(false);
    expect(new NavigationRegistry(manifest, new RouteResolver(manifest), flags).list()).toHaveLength(0);
  });

  it("resolves only compiled screens and fails closed for unknown keys", () => {
    const registry = new RouteRegistry();
    expect(registry.resolve("activity").available).toBe(true);
    expect(registry.resolve("remote-code").available).toBe(false);
    const items = [nav("activity-verify", "activity", 1), nav("quote-create", "remote-code", 2)];
    expect(registry.uiRoutes(items, { catalog: new CatalogRegistry(base), api: new HttpApiPort(null) })).toHaveLength(1);
  });

  it("ignores unknown and unsafe design tokens", () => {
    const manifest = { ...base, tokens: [token("color.bg", "#101018"), token("unknown.key", "#ffffff"), token("color.brand", "url(javascript:bad)")] };
    const registry = new DesignTokenRegistry(manifest);
    expect(registry.toCssVariables()).toEqual({ "--rg-color-bg": "#101018" });
  });

  it("keeps one manifest navigation source for every viewport", () => {
    const routes = new RouteResolver(base);
    const flags = new FeatureFlagRegistry(base);
    const items = new NavigationRegistry(base, routes, flags).list();
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.route_key)).toEqual(["quote-create", "activity-verify", "wallet-get"]);
  });
});
