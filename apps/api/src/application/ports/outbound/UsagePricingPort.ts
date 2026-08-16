import type { ChatQuote } from '../../../domain/entities/ChatQuote';
import type { ProviderResponse } from './provider-port';

export interface UsagePricingPort {
  price(input: { quote: ChatQuote; response: ProviderResponse }): bigint;
}

export class QuoteUsagePricing implements UsagePricingPort {
  price(input: { quote: ChatQuote; response: ProviderResponse }): bigint {
    if (input.response.billableUserCredits !== undefined) return input.response.billableUserCredits;
    return input.response.content.length > 0 || input.response.usage ? input.quote.creditPrice.value : 0n;
  }
}
