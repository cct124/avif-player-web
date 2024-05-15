import { MainEventEmitter } from "../Observer";
import { WorkerEventMap } from "../types/WorkerMessageType";
import WorkerManager from "../WorkerManager/index";
export default class DecoderManager {
    workerDecoderUrl: string;
    /**
     * 解码器集合
     */
    decoderWorkers: WorkerManager<MainEventEmitter<WorkerEventMap>>;
    constructor(workerDecoderUrl: string);
    decoder(id: string, arrayBuffer: Uint8Array): Promise<void>;
}
