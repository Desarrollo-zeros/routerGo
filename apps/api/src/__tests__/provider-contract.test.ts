import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import { GatewayAdapterFactory } from '../infrastructure/adapters/providers/gateway-adapter-factory.js';
import { PoolController } from '../application/services/pool-controller.js';

type Proto = 'responses' | 'messages' | 'chat_completions';

const payloads: Record<Proto, { raw: unknown; text: string; usage:[number,number] }> = {
  responses: { raw: { id:'resp_1', output:[{content:[{text:'hello responses'}]}], usage:{input_tokens:10,output_tokens:20}}, text:'hello responses', usage:[10,20]},
  messages: { raw: { id:'msg_1', content:[{text:'hello messages'}], usage:{input_tokens:11,output_tokens:21}}, text:'hello messages', usage:[11,21]},
  chat_completions: { raw: { id:'chat_1', choices:[{message:{content:'hello chat'}}], usage:{prompt_tokens:12,completion_tokens:22}}, text:'hello chat', usage:[12,22]},
};

const chunkMap: Record<Proto, { parts:string[]; rawChunks:unknown[] }> = {
  responses: { parts:['hel','lo resp'], rawChunks:[{delta:'hel'},{delta:'lo resp'},{type:'response.completed'}]},
  messages: { parts:['hel','lo msg'], rawChunks:[{delta:{text:'hel'}},{delta:{text:'lo msg'}},{type:'message_stop'}]},
  chat_completions: { parts:['hel','lo chat'], rawChunks:[{choices:[{delta:{content:'hel'},finish_reason:null}]},{choices:[{delta:{content:'lo chat'},finish_reason:null}]},{choices:[{delta:{},finish_reason:'stop'}]}]},
};

const gateways: Array<{ kind:'ZEN'|'GO'; id:string }> = [{kind:'ZEN',id:'gw-zen'},{kind:'GO',id:'gw-go'}];

let app: ReturnType<typeof Fastify>;
let base: string;

beforeAll(async () => {
  app = Fastify();
  app.post('/responses', async ()=> payloads.responses.raw);
  app.post('/messages', async ()=> payloads.messages.raw);
  app.post('/chat/completions', async ()=> payloads.chat_completions.raw);
  // stream mock as NDJSON
  app.post('/responses/stream', async (_req: unknown,reply: { type:(s:string)=>{ raw:{ write:(a:string)=>void; end:()=>void } }; raw:{ write:(a:string)=>void; end:()=>void } })=> { reply.type('text/event-stream'); for(const c of chunkMap.responses.rawChunks) reply.raw.write(`data: ${JSON.stringify(c)}\n\n`); reply.raw.end(); });
  await app.listen({ port:0, host:'127.0.0.1' });
  const a = app.server.address() as { port:number };
  base = `http://127.0.0.1:${a.port}`;
});

afterAll(async () => { await app.close(); });

describe('provider contract (upstream falso fastify)', () => {
  it('factory rechaza mapper desconocido', () => {
    const f = new GatewayAdapterFactory();
    expect(()=>f.getStrategy('unknown_proto' as never)).toThrow();
  });

  for(const gw of gateways) for(const proto of Object.keys(payloads) as Proto[]) {
    it(`${gw.kind} ${proto} non-stream → content+usage`, async () => {
      const fac = new GatewayAdapterFactory();
      const strat = fac.getStrategy(proto);
      const { urlPath, body } = strat.buildRequest({ model:'m', messages:[{role:'user',content:'hi'}], maxTokens:10 });
      expect(urlPath).toBe(proto==='responses'?'/responses':proto==='messages'?'/messages':'/chat/completions');
      expect((body as {model:string}).model).toBe('m');
      const res = await fetch(`${base}${urlPath}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});
      const json = await res.json() as unknown;
      const parsed = strat.parseResponse(json);
      const exp = payloads[proto];
      expect(parsed.content).toBe(exp.text);
      expect(parsed.usage).toEqual({inputTokens:exp.usage[0],outputTokens:exp.usage[1]});
    });
  }

  for(const proto of Object.keys(chunkMap) as Proto[]) {
    it(`${proto} stream chunks → delta+done`, () => {
      const fac = new GatewayAdapterFactory();
      const s = fac.getStrategy(proto);
      const { rawChunks, parts } = chunkMap[proto];
      let acc='';
      for(let i=0;i<rawChunks.length;i++){
        const ch = s.parseChunk(rawChunks[i]);
        if(i<parts.length){ expect(ch.delta).toBe(parts[i]); expect(ch.done).toBe(false); acc+=ch.delta; }
        else { expect(ch.done).toBe(true); expect(ch.delta).toBe(''); }
      }
      expect(acc).toBe(parts.join(''));
    });
  }

  it('PoolController corta al 80% (incluido) y permite 79.9%', async () => {
    const now = new Date();
    const deps = (used:bigint,limit:bigint)=>({
      deploymentRows: async()=>[{id:'dep1',gatewayId:'gw-zen',poolKind:'ZEN_FREE',quotaScopeId:'scope1',status:'ACTIVE',cooldownUntil:null}],
      windowRows: async()=>[{quotaScopeId:'scope1',windowType:'5H',usedValue:used,limitValue:limit}],
      cache: { setEligible: async(_:string[])=>{}, getEligible: async()=>[], ttlSeconds:()=>60 } as never,
      clock: { now:()=>now },
    });
    const c80 = new PoolController(deps(80n,100n));
    expect(await c80.refresh()).toEqual([]);
    const c79 = new PoolController(deps(79n,100n));
    expect(await c79.refresh()).toEqual(['dep1']);
    const c0limit = new PoolController(deps(0n,0n));
    expect(await c0limit.refresh()).toEqual(['dep1']);
    const cCooldown = new PoolController({ ...deps(0n,100n), deploymentRows: async()=>[{id:'dep2',gatewayId:'gw-go',poolKind:'GO',quotaScopeId:'scope2',status:'ACTIVE',cooldownUntil:new Date(Date.now()+60000)}] });
    expect(await cCooldown.refresh()).toEqual([]);
  });
});
