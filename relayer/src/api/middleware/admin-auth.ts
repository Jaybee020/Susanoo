import type { FastifyRequest, FastifyReply } from "fastify";
import { getConfig } from "../../config.js";

export async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers["x-api-key"];
  const config = getConfig();

  if (!apiKey || apiKey !== config.ADMIN_API_KEY) {
    reply.code(401).send({ error: "Unauthorized" });
  }
}
