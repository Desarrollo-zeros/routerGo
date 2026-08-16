# Developer API — chat completions

RouterGo exposes the non-streaming compatibility subset at `POST /v1/chat/completions`.
The route and its schemas are loaded from the published runtime manifest. The
application flow is:

`API key context → CreateQuote → ExecuteQuotedRun → provider adapter → settle/release`

The provider target is resolved from `model_catalog`, `provider_endpoints`, and
`provider_gateways`. HTTP calls use the shared timeout, bounded retry, backoff,
and circuit-breaker infrastructure. Provider request IDs and usage are carried
through the run result for accounting and the OpenAI-compatible response.

`POST /v1/responses` reuses the same accounting boundary and supports provider
SSE delivery for `stream=true`; `/v1/chat/completions` remains non-streaming in
this compatibility subset. A request without an authenticated API-key context
returns `401`; transport key validation, revocation, quota errors, and richer
error contracts remain T036.
