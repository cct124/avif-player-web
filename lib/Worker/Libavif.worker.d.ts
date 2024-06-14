import { WorkerEventEmitter } from "../Observer/index";
import { AvifDecoderEventMap, AvifDecoderNextImageData, AvifDecoderParseComplete, WorkerAvifDecoderCallBackEventMap, WorkerAvifDecoderEventMap } from "../types/WorkerMessageType";
import Libavif from "./Libavif";
export default class LibavifWorker extends WorkerEventEmitter<WorkerAvifDecoderEventMap, WorkerAvifDecoderCallBackEventMap, AvifDecoderEventMap> {
    id: string;
    libavif?: Libavif;
    streamingNthImageCallback: (data: AvifDecoderNextImageData, arrayBuffer?: ArrayBuffer) => void;
    decoderNthImageResult: number;
    frameIndex: number;
    constructor();
    initialAvifDecodeFileWeb(): Promise<void>;
    avifDecodeStreamingParse(callback?: (data: AvifDecoderParseComplete) => void): void;
    avifDecoderStreamingNthImage(): void;
}
