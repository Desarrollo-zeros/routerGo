import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';

const root = process.cwd();
const allowed = new Map([
  ['agents', 'AGENTS.md'],
  ['constitution', '.specify/memory/constitution.md'],
  ['spec', 'specs/001-routergo-platform/spec.md'],
  ['plan', 'specs/001-routergo-platform/plan.md'],
  ['tasks', 'specs/001-routergo-platform/tasks.md'],
  ['architecture', '.agents/skills/routergo-architecture/SKILL.md'],
  ['business', '.agents/skills/routergo-business/SKILL.md'],
  ['design', '.agents/skills/routergo-design/SKILL.md'],
  ['routing', '.agents/skills/routergo-routing/SKILL.md'],
  ['quality', '.agents/skills/routergo-quality/SKILL.md'],
  ['spec-skill', '.agents/skills/routergo-spec/SKILL.md'],
]);

const tools = [
  {
    name: 'routergo_context',
    description: 'Return canonical RouterGo development guidance pointers.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'routergo_read',
    description: 'Read an allow-listed RouterGo guidance artifact.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string', enum: [...allowed.keys()] } },
      required: ['key'],
      additionalProperties: false,
    },
  },
  {
    name: 'routergo_classify_task',
    description: 'Classify a development request and recommend a RouterGo Codex skill.',
    inputSchema: {
      type: 'object',
      properties: { text: { type: 'string', maxLength: 4000 } },
      required: ['text'],
      additionalProperties: false,
    },
  },
];

function result(text) {
  return { content: [{ type: 'text', text }] };
}

function classify(text) {
  const s = text.toLowerCase();
  const rules = [
    [/wallet|credit|econom|reward|campaign|advert|cost|margin/, 'routergo-business'],
    [/provider|model|router|api key|classifier|skill|prompt/, 'routergo-routing'],
    [/responsive|css|ui|ux|accessib|design|component/, 'routergo-design'],
    [/test|qa|coverage|performance|security|retry|concurr/, 'routergo-quality'],
    [/spec|plan|task|requirement|acceptance/, 'routergo-spec'],
    [/architecture|solid|pattern|refactor|hexagonal/, 'routergo-architecture'],
  ];
  return rules.find(([re]) => re.test(s))?.[1] ?? 'routergo-context';
}

async function callTool(name, args = {}) {
  if (name === 'routergo_context') {
    return result('Read AGENTS.md -> constitution -> active spec/plan/tasks -> matching .agents/skills/routergo-* skill. Rev.7 is canonical.');
  }
  if (name === 'routergo_read') {
    const relative = allowed.get(args.key);
    if (!relative) throw new Error('Guidance key is not allow-listed');
    return result(await fs.readFile(path.join(root, relative), 'utf8'));
  }
  if (name === 'routergo_classify_task') {
    return result(JSON.stringify({ recommendedSkill: classify(String(args.text ?? '')) }));
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handle(message) {
  if (message.method === 'initialize') {
    return { protocolVersion: '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'routergo-dev', version: '0.1.0' } };
  }
  if (message.method === 'tools/list') return { tools };
  if (message.method === 'tools/call') return callTool(message.params?.name, message.params?.arguments);
  if (message.method === 'ping') return {};
  return {};
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
for await (const line of rl) {
  if (!line.trim()) continue;
  let request;
  try {
    request = JSON.parse(line);
    if (!Object.hasOwn(request, 'id')) continue;
    const response = await handle(request);
    process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, result: response })}\n`);
  } catch (error) {
    if (request && Object.hasOwn(request, 'id')) {
      process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32603, message: String(error?.message ?? error) } })}\n`);
    }
  }
}
