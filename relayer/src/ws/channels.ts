import type { WebSocket } from "ws";
import { pubsub } from "./pubsub.js";

const clientSubscriptions = new Map<WebSocket, Set<string>>();
const channelListeners = new Map<string, Map<WebSocket, (...args: any[]) => void>>();

export function subscribe(ws: WebSocket, channel: string) {
  // Track client subscriptions
  if (!clientSubscriptions.has(ws)) {
    clientSubscriptions.set(ws, new Set());
  }
  const subs = clientSubscriptions.get(ws)!;
  if (subs.has(channel)) return;
  subs.add(channel);

  // Create listener for this client+channel
  const listener = (data: any) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ channel, data }));
    }
  };

  if (!channelListeners.has(channel)) {
    channelListeners.set(channel, new Map());
  }
  channelListeners.get(channel)!.set(ws, listener);
  pubsub.on(channel, listener);
}

export function unsubscribe(ws: WebSocket, channel: string) {
  const subs = clientSubscriptions.get(ws);
  if (!subs) return;
  subs.delete(channel);

  const listeners = channelListeners.get(channel);
  if (listeners) {
    const listener = listeners.get(ws);
    if (listener) {
      pubsub.off(channel, listener);
      listeners.delete(ws);
    }
    if (listeners.size === 0) {
      channelListeners.delete(channel);
    }
  }
}

export function unsubscribeAll(ws: WebSocket) {
  const subs = clientSubscriptions.get(ws);
  if (!subs) return;

  for (const channel of subs) {
    unsubscribe(ws, channel);
  }
  clientSubscriptions.delete(ws);
}
