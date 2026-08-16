import React from 'react';
import { Panel, StatusMessage } from '../../design-system/Primitives';
import { HttpAdminContentClient, type AdminContent, type ContentDraft } from '../../runtime/AdminContentClient';

export function ContentManagerView({ accessToken }: { accessToken?: string }): React.ReactElement {
  const [rows, setRows] = React.useState<AdminContent[]>([]);
  const [error, setError] = React.useState<string>();
  const [draft, setDraft] = React.useState<ContentDraft>({ slug: '', title: '', body: '' });
  const [saving, setSaving] = React.useState(false);
  const client = React.useMemo(() => new HttpAdminContentClient(), []);
  React.useEffect(() => {
    if (!accessToken) { setRows([]); return; }
    void client.list(accessToken).then(setRows).catch((reason: Error) => setError(reason.message));
  }, [accessToken, client]);
  const publish = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (!accessToken) return;
    setSaving(true); setError(undefined);
    try { await client.publish(accessToken, draft); setRows(await client.list(accessToken)); setDraft({ slug: '', title: '', body: '' }); } catch (reason) { setError(reason instanceof Error ? reason.message : 'admin_content_publish_failed'); } finally { setSaving(false); }
  };
  return <Panel title="CMS de contenido publicado"><p className="admin-panel-copy">Publica contenido que la PWA consume desde PostgreSQL. Cada publicación crea una versión auditable.</p>{error ? <StatusMessage tone="error">{error}</StatusMessage> : null}{!accessToken ? <StatusMessage>Conecta Studio con una clave que tenga cms.publish.</StatusMessage> : <><form className="admin-content-editor" onSubmit={(event) => void publish(event)}><div><label htmlFor="content-slug">Slug</label><input id="content-slug" value={draft.slug} onChange={(event) => setDraft({ ...draft, slug: event.target.value })} placeholder="mi-articulo" required /></div><div><label htmlFor="content-title">Título</label><input id="content-title" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required /></div><div><label htmlFor="content-body">Contenido</label><textarea id="content-body" rows={4} value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required /></div><button className="admin-button" type="submit" disabled={saving}>{saving ? 'Publicando…' : 'Publicar contenido'}</button></form><div className="admin-content-list">{rows.map((row) => <article className="admin-content-card" key={row.slug}><span>{row.slug}</span><h3>{row.title}</h3><p>{row.body}</p></article>)}</div></>}</Panel>;
}
