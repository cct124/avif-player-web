import { WorkerEventEmitter } from "../Observer/index";
import { AvifDecoderEventMap, AvifDecoderNextImageData, AvifDecoderParseComplete, WorkerAvifDecoderCallBackEventMap, WorkerAvifDecoderEventMap } from "../types/WorkerMessageType";
import { AID_TYPE } from "../types/index.js";
import Libavif from "./Libavif";
export default class LibavifWorker extends WorkerEventEmitter<WorkerAvifDecoderEventMap, WorkerAvifDecoderCallBackEventMap, AvifDecoderEventMap> {
    streamingNthImageCallback: (data: AvifDecoderNextImageData, arrayBuffer?: ArrayBuffer) => void;
    decoderNthImageResult: number;
    frameIndex: number;
    libavifs: Libavif[];
    AvifDecodeFileWeb: any;
    decoderPtr: number;
    constructor();
    initialAvifDecodeFileWeb(): Promise<void>;
    avifDecodeStreamingParse(libavif: Libavif, callback?: (data: AvifDecoderParseComplete) => void): void;
    avifDecoderStreamingNthImage(id: AID_TYPE, libavif: Libavif): void;
    getLibavif(id: AID_TYPE): Libavif;
}
