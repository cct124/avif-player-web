import { MainEventEmitter } from "../Observer";
import { DecoderImageData, WorkerEventMap } from "../types/WorkerMessageType";
export default class Decoder extends MainEventEmitter<WorkerEventMap> {
    constructor(url: string);
    decoderImageData(data: DecoderImageData): void;
}
