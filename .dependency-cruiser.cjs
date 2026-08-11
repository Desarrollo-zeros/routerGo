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
      comment: "features no importan transporte directo",
      severity: "error",
      from: { path: "apps/web/src/features" },
      to: { path: "apps/web/src/adapters" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
  },
};
