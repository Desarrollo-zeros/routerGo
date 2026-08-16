import { describe, expect, it, vi } from 'vitest';
import { HttpAdminChallengeClient } from './AdminChallengeClient';

describe('HttpAdminChallengeClient', () => {
  it('rejects missing credentials', async () => {
    await expect(new HttpAdminChallengeClient().list('')).rejects.toThrow('credentials_required');
  });

  it('uses explicit moderation endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
    const client = new HttpAdminChallengeClient('/api');
    await client.list('token');
    await client.submit('token', 'challenge-1');
    await client.approve('token', 'challenge-1');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe('/api/admin/challenges/challenge-1/submit');
    vi.unstubAllGlobals();
  });
});
