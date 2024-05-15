import workerScript from "./worker/worker";
import { MainEventEmitter } from "./observer/index";
import { EventMap, MessageType } from "./MessageType";

const blob = new Blob([workerScript], { type: "text/javascript" });
const workerUrl = URL.createObjectURL(blob);

export default class Libavif {
  worker: MainEventEmitter<typeof EventMap>;

  constructor() {
    this.worker = new MainEventEmitter<typeof EventMap>(workerUrl);
    this.worker.on(MessageType.initial, (data) => {
      console.log(data);
    });
  }

  loadFile(uint8Array: Uint8Array) {}

  async fetchFileArrayBuffer(url: string) {
    const res = await fetch(url);
    return await res.arrayBuffer();
  }
}
