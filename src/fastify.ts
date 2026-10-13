// Fastify plugin serving reports AND invoices (createMgplApi) under the registration prefix.
//
//   import Fastify from "fastify";
//   import { mgplFastify } from "@mgpl-diagnostics/invoice-kit/fastify";
//   const app = Fastify();
//   await app.register(mgplFastify, { prefix: "/api/mgpl", cors: "https://app.example.com" });
import type { FastifyPluginAsync } from "fastify";
import { mgplFastify as reportPlugin, type FastifyMgplOptions } from "@mgpl-diagnostics/report-kit/fastify";
import { createMgplApi } from "./api";

export type { FastifyMgplOptions };

export const mgplFastify: FastifyPluginAsync<FastifyMgplOptions> = async (fastify, options) => {
  const basePath = options.basePath ?? (fastify.prefix || "/api/mgpl");
  await reportPlugin(fastify, { ...options, basePath, handler: options.handler ?? createMgplApi({ ...options, basePath }) });
};
