import type pg from 'pg';

export async function seedLearning(client: pg.PoolClient): Promise<void> {
  await client.query(`INSERT INTO challenge_definitions(id,challenge_key,challenge_type,verification_strategy,status)
    VALUES ('learning-routergo-basics','learning.routergo-basics','LEARNING','learning.v1','APPROVED')
    ON CONFLICT (id) DO UPDATE SET status='APPROVED',updated_at=now()`);
  await client.query(`INSERT INTO challenge_versions(id,challenge_id,version,content_json,reward_policy_json,status)
    VALUES ('learning-routergo-basics-v1','learning-routergo-basics',1,$1,$2,'PUBLISHED')
    ON CONFLICT (id) DO UPDATE SET content_json=EXCLUDED.content_json,reward_policy_json=EXCLUDED.reward_policy_json,status='PUBLISHED'`, [
    JSON.stringify({ title: 'Primeros pasos con IA', summary: 'Aprende a elegir un modelo y escribir una solicitud clara.', lessons: [{ title: 'Elige con intención' }, { title: 'Escribe un buen contexto' }, { title: 'Revisa antes de enviar' }] }),
    JSON.stringify({ kind: 'fixed', credits: 300 }),
  ]);
  await client.query(`INSERT INTO challenge_reward_rules(id,challenge_version_id,policy_json,max_reward_credits)
    VALUES ('learning-routergo-basics-reward','learning-routergo-basics-v1',$1,300)
    ON CONFLICT (id) DO UPDATE SET policy_json=EXCLUDED.policy_json,max_reward_credits=EXCLUDED.max_reward_credits`, [JSON.stringify({ kind: 'fixed', credits: 300 })]);
}
