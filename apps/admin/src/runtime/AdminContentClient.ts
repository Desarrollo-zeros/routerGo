export type AdminContent = { slug: string; title: string; body: string };
export type ContentDraft = Omit<AdminContent, 'slug'> & { slug: string };

export class HttpAdminContentClient {
  constructor(private readonly baseUrl = '') {}

  async list(accessToken: string): Promise<AdminContent[]> {
    if (!accessToken.trim()) throw new Error('admin_content_credentials_required');
    const response = await fetch(`${this.baseUrl}/admin/content`, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!response.ok) throw new Error(`admin_content_${response.status}`);
    return response.json() as Promise<AdminContent[]>;
  }

  async publish(accessToken: string, draft: ContentDraft): Promise<AdminContent> {
    if (!accessToken.trim()) throw new Error('admin_content_credentials_required');
    const response = await fetch(`${this.baseUrl}/admin/content`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify(draft) });
    if (!response.ok) throw new Error(`admin_content_${response.status}`);
    return response.json() as Promise<AdminContent>;
  }
}
