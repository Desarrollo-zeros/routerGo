import type pg from 'pg';

const CONTENT = [
  ['cms-help-credits', 'gana-gocredits', 'Gana GoCredits', 'Completa actividades verificadas y revisa el saldo antes de usar modelos.'],
  ['cms-help-ai', 'usa-ia-con-control', 'Usa IA con control', 'El catálogo muestra modelos, capacidades y costo antes de enviar una solicitud.'],
  ['cms-help-privacy', 'cuida-tu-privacidad', 'Cuida tu privacidad', 'La cámara solo se usa para verificar la actividad; el video no se sube.'],
] as const;

export async function seedCms(client: pg.PoolClient): Promise<void> {
  for (const [id, slug, title, body] of CONTENT) {
    await client.query(
      `INSERT INTO cms_content_entries(id,slug,status,created_by) VALUES ($1,$2,'PUBLISHED','system')
       ON CONFLICT (id) DO UPDATE SET slug=EXCLUDED.slug,status='PUBLISHED',updated_at=now()`, [id, slug],
    );
    await client.query(
      `INSERT INTO cms_content_versions(id,content_id,version,title,body,status,created_by)
       VALUES ($1,$2,1,$3,$4,'PUBLISHED','system')
       ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title,body=EXCLUDED.body,status='PUBLISHED'`, [`${id}:v1`, id, title, body],
    );
  }
}
