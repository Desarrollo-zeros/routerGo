import { describe, expect, it } from 'vitest';
import { IntentClassificationError, SchemaConstrainedIntentClassifier } from './SchemaConstrainedIntentClassifier.js';

describe('SchemaConstrainedIntentClassifier', () => {
  it('returns only the constrained classification contract', async () => {
    const classifier = new SchemaConstrainedIntentClassifier({ classify: async () => ({ intent: 'coding', confidence: 0.92, tags: ['typescript'] }) });
    await expect(classifier.classify({ features: 'minimal features' })).resolves.toEqual({ intent: 'coding', confidence: 0.92, tags: ['typescript'] });
  });

  it('rejects unknown intents, invalid confidence, and executable extras', async () => {
    const classifier = new SchemaConstrainedIntentClassifier({ classify: async () => ({ intent: 'unknown', confidence: 2, tags: [], code: 'run()' }) });
    await expect(classifier.classify({ features: 'minimal features' })).rejects.toBeInstanceOf(IntentClassificationError);
  });
});
