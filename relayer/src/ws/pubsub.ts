import { EventEmitter } from "events";

class PubSub extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(1000);
  }
}

export const pubsub = new PubSub();
