import { WorkerEventEmitter } from "../Observer/index";
import { AvifDecoderEventMap, AvifDecoderNextImageData, AvifDecoderParseComplete, WorkerAvifDecoderCallBackEventMap, WorkerAvifDecoderEventMap } from "../types/WorkerMessageType";
import Libavif from "./Libavif";
export default class LibavifWorker extends WorkerEventEmitter<WorkerAvifDecoderEventMap, WorkerAvifDecoderCallBackEventMap, AvifDecoderEventMap> {
    streamingNthImageCallback: (data: AvifDecoderNextImageData, arrayBuffer?: ArrayBuffer) => void;
    decoderNthImageResult: number;
    frameIndex: number;
    libavifs: Libavif[];
    AvifDecodeFileWeb: any;
    constructor();
    initialAvifDecodeFileWeb(): Promise<void>;
    avifDecodeStreamingParse(libavif: Libavif, callback?: (data: AvifDecoderParseComplete) => void): void;
    avifDecoderStreamingNthImage(sourceId: string, libavif: Libavif): void;
    getLibavif(sourceId: string): Libavif;
}
