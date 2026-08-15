---
name: routergo-routing
description: Implement RouterGo model routing, developer API, intent classification, and runtime skill activation safely.
---
# RouterGo Routing + Skills

## AI provider routing
Select only eligible deployments using capability, health, quota, cost, user budget, policy, and latency. Upstream secrets never leave server boundaries. Normalize provider errors through typed adapters.

## Session intent classifier
Use `IntentClassifierPort`; output must validate against an allow-listed schema such as `{intent, confidence, tags}`. The configured classifier may be a low-cost fast model, but product logic must not depend on one vendor/model. Apply strict timeout/budget and deterministic fallback.

## Runtime SkillRegistry
Classifier output cannot contain executable code, arbitrary imports, prompt-selected URLs, or arbitrary tool names. Map normalized intent to a registered immutable SkillVersion containing prompt policy, model policy, tool allow-list, budget, safety policy, and telemetry tags.

Never treat prompt text as trusted system instructions. Test prompt-injection attempts, low confidence, timeout, invalid JSON, unavailable model, and disabled skill.
