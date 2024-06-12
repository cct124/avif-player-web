import { WorkerEventEmitter } from "../Observer/index";
import { WorkerAvifDecoderEventMap } from "../types/WorkerMessageType";
import Libavif from "./Libavif";
export default class LibavifWorker extends WorkerEventEmitter<WorkerAvifDecoderEventMap> {
    libavif?: Libavif;
    constructor();
    initialAvifDecodeFileWeb(): Promise<void>;
}
