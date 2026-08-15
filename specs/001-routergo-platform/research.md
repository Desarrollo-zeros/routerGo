# Research Decisions — RouterGo Rev.7

## GitHub Spec Kit
Adopt Spec Kit's constitution -> specify -> plan -> tasks -> analyze -> implement/converge discipline. Keep RouterGo project-local artifacts so agents remain operational without CLI installation. Codex is supported by Spec Kit as a skills-based integration under `.agents/skills`.

## Architecture
Retain modular monolith: current repo already has useful hexagonal pieces. Microservices would add distributed consistency/ops cost before measured need. Extraction candidates later: inference gateway, realtime battle, ads decisioning, analytics ingestion.

## Economic model
Never peg GoCredits to provider tokens/currency. Reserve worst-case internal credits, then settle measured usage and release excess. Keep user credits separate from advertiser cash/funding and provider expense ledgers.

## Intent classification
A fast inexpensive LLM can improve skill selection, but it is optional infrastructure, not a single point of failure. Require constrained output schema, allow-listed taxonomy, confidence threshold, timeout, budget, and deterministic fallback. Avoid sending more prompt content than necessary.

## Retries
Use retry only for transient failures. Accounting mutations rely on idempotency rather than blind retry. Streaming generations cannot be replayed after first visible token because duplication/cost/state ambiguity can occur.

## MCP
Use a read-only development MCP that exposes project constitution/spec/skills. Production runtime skill routing stays inside application ports so system availability is not tied to Codex/MCP.

## UI
Use one shared responsive design system with dark high-contrast surfaces and RouterGo purple/magenta accents. Validate at 320/360/390/430px plus tablet/desktop; do not clone third-party branding from visual references.
