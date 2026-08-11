# ADR-006: Design system

Estado: Aceptado 2026-08-10

## Contexto
PWA necesita marca propia, tema oscuro, tokens DTCG primitive→semantic→component, WCAG 2.2 AA, sin copiar ilustraciones.

## Decisión
Headless/Compound Components en `apps/web/src/design-system` + Storybook a11y. Tokens en `design_tokens` DB → CSS variables via adapter. `ActivityCard` 12 estados, un CTA primario, sponsors etiquetados. TanStack Charts solo detrás de `ChartPort`, Three.js prohibido en F1.

## Alternativas
- UI kit genérico hardcodeado: impide tematizar desde manifest.
- CSS manual por pantalla: viola DRY y contraste.

## Pruebas
Storybook axe, Playwright responsive 320/360/430, focus-visible, reduced-motion.

## Rollback
Revertir a tokens estáticos si adapter falla.
