---
name: routergo-design
description: Build RouterGo responsive, accessible UI consistent with DevZeros/RouterGo visual language.
---
# RouterGo Design System

Direction: dark technical surfaces, RouterGo purple + DevZeros magenta accents, restrained cyan/success accents. Do not copy third-party logos/brands/screens.

Rules:
- Mobile-first: verify 320, 360, 390, 430 px, tablet, desktop.
- WCAG 2.2 AA target; keyboard/focus-visible; 44px touch targets; reduced motion.
- One primary CTA per view; never hide core product controls behind ads.
- Ads/sponsors visibly labeled and visually separate from rewards/success states.
- Balance always labeled as GoCredits, never ambiguous provider tokens/cash.
- Runtime design tokens/navigation/content come from versioned configuration where operator-managed.
- Components cover loading/empty/error/offline/insufficient-balance/permission-denied states.
- Reserve layout space for async ads/counters to prevent layout shift.

Use headless/compound components and keep feature logic out of design-system primitives.
