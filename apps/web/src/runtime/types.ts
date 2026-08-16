import {
  parseWebRuntimeManifest,
  WebManifestValidationError,
  type WebCatalogEntry,
  type WebDesignToken,
  type WebManifestRoute,
  type WebNavigationItem,
  type WebRuntimeManifest,
} from "@routergo/shared";

export type HttpMethod = WebManifestRoute["method"];
export type TokenType = WebDesignToken["token_type"];
export type ManifestRoute = WebManifestRoute;
export type CatalogEntry = WebCatalogEntry;
export type DesignToken = WebDesignToken;
export type NavItem = WebNavigationItem;
export type UiRoute = WebRuntimeManifest["ui"]["routes"][number];
export type RuntimeManifest = WebRuntimeManifest;

export class ManifestValidationError extends WebManifestValidationError {}

export function parseRuntimeManifest(input: unknown): RuntimeManifest {
  try {
    return parseWebRuntimeManifest(input);
  } catch (error) {
    if (error instanceof WebManifestValidationError) throw new ManifestValidationError(error.message);
    throw error;
  }
}
