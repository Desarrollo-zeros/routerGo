import { z } from 'zod';
import { SchemaRegistry } from '../infrastructure/http/schema-registry.js';

export function createSchemas(): SchemaRegistry {
  const schemas = new SchemaRegistry();
  schemas.registerZod('verifyActivityRequest', z.object({ reps: z.number(), sessionId: z.string() }));
  schemas.registerZod('createQuoteRequest', z.object({ logicalModelId: z.string(), maxOutputTokens: z.number().optional() }));
  schemas.registerZod('createRunRequest', z.object({ quoteId: z.string() }));
  schemas.register('economyResponse', { type: 'object', properties: { go: { type: 'object' }, windows: { type: 'object' }, contribution: { type: 'object' }, unitEconomics: { type: 'object' }, dau: { type: 'number' } } });
  schemas.register('healthResponse', { type: 'object', properties: { status: { type: 'string' } } });
  schemas.register('manifestResponse', { type: 'object' });
  schemas.register('runtimeManifestResponse', { type: 'object', required: ['version', 'contentHash', 'manifest'], properties: { version: { type: 'number' }, contentHash: { type: 'string' }, manifest: { type: 'object' } } });
  schemas.register('runtimeRollbackRequest', { type: 'object', required: ['targetVersion'], properties: { targetVersion: { type: 'integer', minimum: 1 } }, additionalProperties: false });
  schemas.register('catalogResponse', { type: 'object', properties: { models: { type: 'array', items: { type: 'object', properties: { logicalId: { type: 'string' }, tier: { type: 'string' }, creditPrice: { type: 'string' }, enabled: { type: 'boolean' } } } } } });
  schemas.register('modelsResponse', { type: 'object', required: ['object', 'data'], properties: { object: { const: 'list' }, data: { type: 'array', items: { type: 'object', required: ['id', 'object', 'created', 'owned_by'], properties: { id: { type: 'string' }, object: { const: 'model' }, created: { type: 'number' }, owned_by: { type: 'string' } } } } } });
  schemas.register('chatCompletionsRequest', { type: 'object', required: ['model', 'messages'], properties: { model: { type: 'string' }, messages: { type: 'array', minItems: 1, items: { type: 'object', required: ['role', 'content'], properties: { role: { enum: ['system', 'user', 'assistant'] }, content: { type: 'string' } }, additionalProperties: false } }, max_tokens: { type: 'integer', minimum: 1 }, temperature: { type: 'number' }, stream: { type: 'boolean' } }, additionalProperties: false });
  schemas.register('chatCompletionsResponse', { type: 'object', required: ['id', 'object', 'created', 'model', 'choices', 'usage'], properties: { id: { type: 'string' }, object: { const: 'chat.completion' }, created: { type: 'number' }, model: { type: 'string' }, choices: { type: 'array' }, usage: { type: 'object' } } });
  schemas.register('responsesRequest', { type: 'object', required: ['model', 'input'], properties: { model: { type: 'string' }, input: { oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'object' } }] }, max_output_tokens: { type: 'integer', minimum: 1 }, stream: { type: 'boolean' } }, additionalProperties: false });
  schemas.register('responsesResponse', { type: 'object', required: ['id', 'object', 'status', 'model', 'output'], properties: { id: { type: 'string' }, object: { const: 'response' }, status: { const: 'completed' }, model: { type: 'string' }, output: { type: 'array' } } });
  schemas.register('walletResponse', { type: 'object', properties: { walletId: { type: 'string' }, balance: { type: 'string' }, version: { type: 'number' } } });
  schemas.register('ledgerResponse', { type: 'object', properties: { entries: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, kind: { type: 'string' }, amount: { type: 'string' }, occurredAt: { type: 'string' } } } } } });
  schemas.register('verifyActivityResponse', { type: 'object', properties: { verified: { type: 'boolean' } } });
  schemas.register('quoteResponse', { type: 'object', properties: { quoteId: { type: 'string' } } });
  schemas.register('runResponse', { type: 'object', properties: { runId: { type: 'string' } } });
  schemas.register('streamResponse', { type: 'object' });
  registerAdvertiserSchemas(schemas);
  return schemas;
}

function registerAdvertiserSchemas(schemas: SchemaRegistry): void {
  const campaignProperties = { id: { type: 'string' }, name: { type: 'string' }, status: { type: 'string' }, moderationStatus: { type: 'string' }, budgetMicro: { type: 'string' }, spentMicro: { type: 'string' }, sponsoredLabel: { type: 'string' } };
  schemas.register('advertiserAccountResponse', { type: 'object', properties: { accountId: { type: 'string' }, balanceMicro: { type: 'string' }, currency: { const: 'USD' }, status: { type: 'string' } } });
  schemas.register('advertiserCampaignResponse', { type: 'object', properties: campaignProperties });
  schemas.register('advertiserCampaignsResponse', { type: 'array', items: { type: 'object', properties: campaignProperties } });
  schemas.register('advertiserCampaignRequest', { type: 'object', required: ['name', 'budgetMicro'], properties: { name: { type: 'string', minLength: 1 }, budgetMicro: { type: 'string', pattern: '^[1-9][0-9]*$' }, sponsoredLabel: { type: 'string', minLength: 1 } }, additionalProperties: false });
  schemas.register('advertiserCreativeRequest', { type: 'object', required: ['campaignId', 'kind'], properties: { campaignId: { type: 'string' }, kind: { enum: ['TEXT', 'IMAGE', 'VIDEO', 'CHALLENGE'] }, payload: { type: 'object' } }, additionalProperties: false });
  schemas.register('advertiserCreativeResponse', { type: 'object', properties: { id: { type: 'string' }, campaignId: { type: 'string' }, kind: { type: 'string' }, moderationStatus: { type: 'string' }, payload: { type: 'object' } } });
  schemas.register('advertiserCreativesResponse', { type: 'array', items: { type: 'object' } });
  schemas.register('advertiserAnalyticsResponse', { type: 'object', properties: { impressions: { type: 'number' }, clicks: { type: 'number' }, conversions: { type: 'number' }, spendMicro: { type: 'string' } } });
}
