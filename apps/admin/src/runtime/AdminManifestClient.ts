import { parseWebRuntimeManifest, type WebRuntimeManifest } from "@routergo/shared";

export interface RuntimeManifestClient {
  read(): Promise<WebRuntimeManifest>;
}

export class HttpRuntimeManifestClient implements RuntimeManifestClient {
  constructor(private readonly baseUrl = "") {}

  async read(): Promise<WebRuntimeManifest> {
    const response = await fetch(`${this.baseUrl}/runtime-manifest`);
    if (!response.ok) throw new Error(`runtime_manifest_${response.status}`);
    return parseWebRuntimeManifest(await response.json());
  }
}
