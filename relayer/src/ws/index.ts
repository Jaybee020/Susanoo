import type { FastifyInstance } from "fastify";
import { subscribe, unsubscribe, unsubscribeAll } from "./channels.js";
import type { WsMessage } from "../utils/types.js";

const VALID_CHANNEL_PATTERN = /^pool:0x[a-fA-F0-9]{64}:(price|trades|candle:(1m|5m|15m|1h|4h|1d))$/;

export async function registerWebSocket(server: FastifyInstance) {
  server.get("/ws", { websocket: true }, (socket, req) => {
    req.log.info("WebSocket client connected");

    socket.on("message", (raw: Buffer) => {
      try {
        const msg: WsMessage = JSON.parse(raw.toString());

        if (!msg.channel || !VALID_CHANNEL_PATTERN.test(msg.channel)) {
          socket.send(JSON.stringify({ error: "Invalid channel" }));
          return;
        }

        if (msg.action === "subscribe") {
          subscribe(socket, msg.channel);
          socket.send(JSON.stringify({ subscribed: msg.channel }));
        } else if (msg.action === "unsubscribe") {
          unsubscribe(socket, msg.channel);
          socket.send(JSON.stringify({ unsubscribed: msg.channel }));
        }
      } catch {
        socket.send(JSON.stringify({ error: "Invalid message format" }));
      }
    });

    socket.on("close", () => {
      unsubscribeAll(socket);
    });
  });
}
