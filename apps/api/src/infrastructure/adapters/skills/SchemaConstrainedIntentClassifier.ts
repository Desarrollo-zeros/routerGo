import { z } from 'zod';
import type { IntentClassification, IntentClassifierPort, IntentClassifierTransport } from '../../../application/ports/outbound/IntentClassifierPort.js';

const intentSchema = z.object({
  intent: z.enum(['coding', 'reasoning', 'research', 'writing', 'data', 'learning', 'support', 'creative', 'general']),
  confidence: z.number().min(0).max(1),
  tags: z.array(z.string().min(1).max(32)).max(8),
}).strict();

export class IntentClassificationError extends Error {
  constructor() {
    super('INTENT_CLASSIFICATION_SCHEMA_INVALID');
  }
}

export class SchemaConstrainedIntentClassifier implements IntentClassifierPort {
  constructor(private readonly transport: IntentClassifierTransport) {}

  async classify(input: { features: string }): Promise<IntentClassification> {
    const parsed = intentSchema.safeParse(await this.transport.classify(input.features));
    if (!parsed.success) throw new IntentClassificationError();
    return parsed.data;
  }
}
