import { createComposition, buildCompositionApp } from './composition-root/composition.js';

const port = Number(process.env.PORT ?? 3000);

async function main(): Promise<void> {
  const comp = await createComposition();
  const app = buildCompositionApp(comp);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`[api] listening on ${port}`);
}
main().catch((e) => {
  console.error('[api] failed', e);
  process.exit(1);
});
