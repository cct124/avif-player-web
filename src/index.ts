import workerScript from "./Workers/worker";
import { MainEventEmitter } from "./Observers/index";
import { EventMap, MessageType } from "./MessageType";

const blob = new Blob([workerScript], { type: "text/javascript" });
const workerUrl = URL.createObjectURL(blob);

export default class SoftAvifWeb {
  worker: MainEventEmitter<EventMap>;

  constructor() {
    this.worker = new MainEventEmitter<EventMap>(workerUrl);
    this.worker.on(MessageType.initial, (data) => {
      console.log(`Libavif Version: ${data}`);
    });
  }

  loadFile(uint8Array: Uint8Array) {}

  async fetchFileArrayBuffer(url: string) {
    const res = await fetch(url);
    return await res.arrayBuffer();
  }
}
