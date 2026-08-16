import { z } from 'zod';
import { SchemaRegistry } from '../infrastructure/http/schema-registry.js';

export function createSchemas(): SchemaRegistry {
  const schemas = new SchemaRegistry();
  schemas.registerZod('verifyActivityRequest', z.object({ reps: z.number(), sessionId: z.string() }));
  schemas.registerZod('createQuoteRequest', z.object({ logicalModelId: z.string(), idempotencyKey: z.string(), maxOutputTokens: z.number().optional() }));
  schemas.register('createRunRequest', { type: 'object', required: ['quoteId', 'idempotencyKey', 'messages'], properties: { quoteId: { type: 'string' }, idempotencyKey: { type: 'string' }, stream: { type: 'boolean' }, messages: { type: 'array', minItems: 1, items: { type: 'object', required: ['role', 'content'], properties: { role: { enum: ['system', 'user', 'assistant'] }, content: { type: 'string' } }, additionalProperties: false } } }, additionalProperties: false });
  schemas.register('economyResponse', { type: 'object', properties: { go: { type: 'object' }, windows: { type: 'object' }, contribution: { type: 'object' }, unitEconomics: { type: 'object' }, dau: { type: 'number' } } });
  schemas.register('providerAnalyticsResponse', { type: 'array', items: { type: 'object', required: ['gatewayId', 'health', 'quotaUsagePct', 'costMicro', 'alert'], properties: { gatewayId: { type: 'string' }, health: { type: 'string' }, quotaUsagePct: { type: 'number' }, costMicro: { type: 'number' }, alert: { type: 'string' } } } });
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
  schemas.register('ledgerResponse', { type: 'object', properties: { entries: { type: 'array', items: { type: 'object', required: ['id', 'type', 'amount_signed', 'created_at'], properties: { id: { type: 'string' }, type: { type: 'string' }, amount_signed: { type: 'string' }, created_at: { type: 'string' } } } } } });
  schemas.register('adminLedgerResponse', { type: 'object', properties: { entries: { type: 'array', items: { type: 'object', required: ['id', 'kind', 'amount', 'occurredAt'], properties: { id: { type: 'string' }, kind: { type: 'string' }, amount: { type: 'string' }, occurredAt: { type: 'string' } } } } } });
  schemas.register('verifyActivityResponse', { type: 'object', required: ['ledgerId', 'credits', 'newBalance', 'reused'], properties: { ledgerId: { type: 'string' }, credits: { type: 'string' }, newBalance: { type: 'string' }, reused: { type: 'boolean' } } });
  schemas.register('quoteResponse', { type: 'object', properties: { quoteId: { type: 'string' } } });
  schemas.register('runResponse', { type: 'object', properties: { runId: { type: 'string' } } });
  schemas.register('streamResponse', { type: 'object' });
  registerAdvertiserSchemas(schemas);
  schemas.register('publicAdResponse', { type: 'object', required: ['outcome', 'placementKey', 'reason'], properties: { outcome: { enum: ['SELECTED', 'NO_FILL'] }, placementKey: { type: 'string' }, reason: { enum: ['SELECTED', 'NO_ELIGIBLE_CANDIDATE'] }, sponsoredLabel: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' }, imageUrl: { type: 'string' }, clickUrl: { type: 'string' } } });
  schemas.register('publishedContentResponse', { type: 'array', items: { type: 'object', required: ['slug', 'title', 'body'], properties: { slug: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } } } });
  schemas.register('publishedContentEntryResponse', { type: 'object', required: ['slug', 'title', 'body'], properties: { slug: { type: 'string' }, title: { type: 'string' }, body: { type: 'string' } } });
  schemas.register('contentPublishRequest', { type: 'object', required: ['slug', 'title', 'body'], properties: { slug: { type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' }, title: { type: 'string', minLength: 1 }, body: { type: 'string', minLength: 1 } }, additionalProperties: false });
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
  schemas.register('challengeCreateRequest', { type: 'object', required: ['challengeKey', 'challengeType', 'verificationStrategy', 'maxRewardCredits'], properties: { challengeKey: { type: 'string', minLength: 1 }, challengeType: { enum: ['QUIZ', 'CODING', 'LEARNING', 'EXERCISE', 'SPONSORED'] }, verificationStrategy: { type: 'string', minLength: 1 }, content: { type: 'object' }, rewardPolicy: { type: 'object' }, maxRewardCredits: { type: 'string', pattern: '^[1-9][0-9]*$' } }, additionalProperties: false });
  const challengeProperties = { id: { type: 'string' }, challengeKey: { type: 'string' }, challengeType: { type: 'string' }, verificationStrategy: { type: 'string' }, status: { type: 'string' }, version: { type: 'number' }, versionStatus: { type: 'string' }, maxRewardCredits: { type: 'string' } };
  schemas.register('challengeResponse', { type: 'object', properties: challengeProperties });
  schemas.register('challengeListResponse', { type: 'array', items: { type: 'object', properties: challengeProperties } });
}
