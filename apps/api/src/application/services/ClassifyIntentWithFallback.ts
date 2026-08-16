import type { Intent, IntentClassification, IntentClassifierPort } from '../ports/outbound/IntentClassifierPort.js';
import type { IntentClassificationBudgetPort } from '../ports/outbound/IntentClassificationBudget.js';

type FallbackConfig = { timeoutMs: number; minimumConfidence: number; defaultIntent: Intent };

const RULES: Array<{ intent: Intent; terms: string[] }> = [
  { intent: 'coding', terms: ['code', 'typescript', 'bug', 'api'] },
  { intent: 'research', terms: ['research', 'source', 'paper', 'investigate'] },
  { intent: 'writing', terms: ['write', 'draft', 'rewrite', '文章'] },
  { intent: 'data', terms: ['data', 'csv', 'table', 'query'] },
  { intent: 'learning', terms: ['learn', 'study', 'lesson', 'explain'] },
];

export class ClassifyIntentWithFallback {
  constructor(private readonly classifier: IntentClassifierPort, private readonly budget: IntentClassificationBudgetPort, private readonly config: FallbackConfig) {}

  async execute(features: string): Promise<IntentClassification> {
    if (!await this.budget.canClassify()) return fallback(features, this.config);
    try {
      const result = await withTimeout(this.classifier.classify({ features }), this.config.timeoutMs);
      return result.confidence >= this.config.minimumConfidence ? result : fallback(features, this.config);
    } catch {
      return fallback(features, this.config);
    }
  }
}

function fallback(features: string, config: FallbackConfig): IntentClassification {
  const normalized = features.toLowerCase();
  const match = RULES.find((rule) => rule.terms.some((term) => normalized.includes(term)));
  return { intent: match?.intent ?? config.defaultIntent, confidence: match ? 0.5 : 0, tags: match ? ['heuristic'] : ['default'] };
}

function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) return Promise.reject(new Error('INVALID_CLASSIFIER_TIMEOUT'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('CLASSIFIER_TIMEOUT')), timeoutMs);
    task.then((value) => { clearTimeout(timer); resolve(value); }, (error) => { clearTimeout(timer); reject(error); });
  });
}
