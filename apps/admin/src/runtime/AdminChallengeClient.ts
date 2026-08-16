export type AdminChallenge = { id: string; challengeKey: string; challengeType: string; verificationStrategy: string; status: string; version: number; versionStatus: string; maxRewardCredits: string };

export class HttpAdminChallengeClient {
  constructor(private readonly baseUrl = '') {}
  async list(accessToken: string): Promise<AdminChallenge[]> { return this.request<AdminChallenge[]>('/admin/challenges', accessToken); }
  async create(accessToken: string, input: Record<string, unknown>): Promise<AdminChallenge> { return this.request<AdminChallenge>('/admin/challenges', accessToken, 'POST', input); }
  async submit(accessToken: string, id: string): Promise<AdminChallenge> { return this.request<AdminChallenge>(`/admin/challenges/${id}/submit`, accessToken, 'POST'); }
  async approve(accessToken: string, id: string): Promise<AdminChallenge> { return this.request<AdminChallenge>(`/admin/challenges/${id}/approve`, accessToken, 'POST'); }

  private async request<T>(path: string, accessToken: string, method = 'GET', body?: unknown): Promise<T> {
    if (!accessToken.trim()) throw new Error('admin_challenge_credentials_required');
    const response = await fetch(`${this.baseUrl}${path}`, { method, headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    if (!response.ok) throw new Error(`admin_challenge_${response.status}`);
    return response.json() as Promise<T>;
  }
}
