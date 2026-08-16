import { describe, expect, it } from 'vitest';
import { ClassifyIntentWithFallback } from './ClassifyIntentWithFallback.js';

const config = { timeoutMs: 20, minimumConfidence: 0.7, defaultIntent: 'general' as const };
const budget = (allowed: boolean) => ({ canClassify: async () => allowed });

describe('ClassifyIntentWithFallback', () => {
  it('uses a confident classifier result', async () => {
    const useCase = new ClassifyIntentWithFallback({ classify: async () => ({ intent: 'coding', confidence: 0.9, tags: [] }) }, budget(true), config);
    await expect(useCase.execute('features')).resolves.toMatchObject({ intent: 'coding', confidence: 0.9 });
  });

  it('falls back on low confidence, budget denial, and timeout', async () => {
    const low = new ClassifyIntentWithFallback({ classify: async () => ({ intent: 'creative', confidence: 0.2, tags: [] }) }, budget(true), config);
    const denied = new ClassifyIntentWithFallback({ classify: async () => ({ intent: 'creative', confidence: 1, tags: [] }) }, budget(false), config);
    const slow = new ClassifyIntentWithFallback({ classify: () => new Promise((resolve) => setTimeout(() => resolve({ intent: 'creative' as const, confidence: 1, tags: [] }), 50)) }, budget(true), config);
    await expect(low.execute('typescript bug')).resolves.toMatchObject({ intent: 'coding', tags: ['heuristic'] });
    await expect(denied.execute('unknown')).resolves.toMatchObject({ intent: 'general', tags: ['default'] });
    await expect(slow.execute('research paper')).resolves.toMatchObject({ intent: 'research', tags: ['heuristic'] });
  });
});
