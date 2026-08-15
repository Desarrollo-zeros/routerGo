---
name: routergo-spec
description: Use GitHub Spec Kit style to specify, plan, task, analyze, and converge RouterGo features.
---
# RouterGo Spec-Driven Development

For a new feature create `specs/NNN-feature-name/` with:
- `spec.md`: what/why, prioritized independent user stories, acceptance, requirements, measurable outcomes.
- `research.md`: decisions/alternatives/unknowns.
- `plan.md`: technical context, constitution check, structure, architecture, phases.
- `data-model.md`: entities/invariants/transitions.
- `contracts/`: API/event schemas.
- `quickstart.md`: agent execution/verification path.
- `tasks.md`: exact tasks grouped by user story, dependencies and `[P]` parallel ownership.

Do not turn `spec.md` into implementation details. Do not leave `NEEDS CLARIFICATION` unresolved before implementation of critical economic/security behavior. Re-run consistency analysis after tasks and convergence after implementation.
