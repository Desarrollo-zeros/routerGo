export const INTENTS = ['coding', 'reasoning', 'research', 'writing', 'data', 'learning', 'support', 'creative', 'general'] as const;
export type Intent = typeof INTENTS[number];

export type IntentClassification = {
  intent: Intent;
  confidence: number;
  tags: readonly string[];
};

export type IntentClassificationInput = {
  features: string;
};

export interface IntentClassifierPort {
  classify(input: IntentClassificationInput): Promise<IntentClassification>;
}

export interface IntentClassifierTransport {
  classify(features: string): Promise<unknown>;
}
