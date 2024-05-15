import { MainEventEmitter } from "./Observers/index";
import { EventMap } from "./MessageType";
export default class SoftAvifWeb {
    worker: MainEventEmitter<EventMap>;
    constructor();
    loadFile(uint8Array: Uint8Array): void;
    fetchFileArrayBuffer(url: string): Promise<ArrayBuffer>;
}
