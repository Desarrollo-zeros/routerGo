const contextNames = [
  "identity", "economy", "wallet", "ai-routing", "developer-api", "challenges",
  "exercise", "battle", "treasure", "cms", "ads", "advertiser", "risk",
  "analytics", "notifications",
];

const crossContextRules = contextNames.map((source) => ({
  name: `cross-context-internals-${source}`,
  comment: "bounded contexts may depend on explicit contracts, not another context's internals",
  severity: "error",
  from: { path: `apps/api/src/contexts/${source}/` },
  to: {
    path: `apps/api/src/contexts/(?!${source}/)[^/]+/(domain|application|infrastructure)/`,
  },
}));

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "domain-no-framework",
      comment: "domain no importa Fastify/ORM/Redis/HTTP/TypeBox/SDK",
      severity: "error",
      from: { path: "apps/api/src/domain" },
      to: { dependencyTypes: ["npm"], path: "^(fastify|pg|ioredis|@fastify|zod|bullmq|redis)" },
    },
    {
      name: "domain-no-infra",
      comment: "domain no importa infrastructure ni application",
      severity: "error",
      from: { path: "apps/api/src/domain" },
      to: { path: "apps/api/src/(application|infrastructure|composition-root)" },
    },
    {
      name: "app-no-infra",
      comment: "application solo conoce domain+ports",
      severity: "error",
      from: { path: "apps/api/src/application" },
      to: { path: "apps/api/src/infrastructure" },
    },
    {
      name: "web-design-system-isolation",
      comment: "design-system no importa features",
      severity: "error",
      from: { path: "apps/web/src/design-system" },
      to: { path: "apps/web/src/features" },
    },
    {
      name: "web-features-no-transport",
      comment: "new features must use application ports; legacy adapters are explicit transitional exceptions",
      severity: "error",
      from: {
        path: "apps/web/src/features",
        pathNot: "apps/web/src/features/(wallet/useWallet|chat/useChat|activity/useActivityMachine|activity/ActivityView)\\.(ts|tsx)$",
      },
      to: { path: "apps/web/src/adapters" },
    },
    ...crossContextRules,
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
  },
};
