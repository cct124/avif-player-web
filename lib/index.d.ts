import { MainEventEmitter } from "./observer/index";
import { EventMap } from "./MessageType";
export default class Libavif {
    worker: MainEventEmitter<typeof EventMap>;
    constructor();
    loadFile(uint8Array: Uint8Array): void;
    fetchFileArrayBuffer(url: string): Promise<ArrayBuffer>;
}
