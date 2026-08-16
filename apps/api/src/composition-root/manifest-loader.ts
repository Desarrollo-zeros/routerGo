import type pg from 'pg';
import { loadRuntimeManifest } from '../config/RuntimeManifest.js';

export async function loadRequiredManifest(pool: pg.Pool) {
  const manifest = await loadRuntimeManifest(pool);
  console.log(`[manifest] loaded v${manifest.version} models=${manifest.models.length} routes=${manifest.routes.length}`);
  return manifest;
}
