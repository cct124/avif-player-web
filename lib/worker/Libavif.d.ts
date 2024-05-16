import { WorkerAvifDecoderEventMap } from "../types/WorkerMessageType";
import { WorkerEventEmitter } from "../Observer/index";
export default class Libavif extends WorkerEventEmitter<WorkerAvifDecoderEventMap> {
    AwsmAvifDecode: any;
    decoderPtr?: number;
    bufferPtr?: number;
    constructor(awsmAvifDecode: any);
    avifDecoderParse(arrayBuffer: ArrayBuffer): void;
    avifDecoderImage(): void;
    getImageTiming(timingPtr: number): {
        timescale: any;
        pts: any;
        ptsInTimescales: any;
        duration: any;
        durationInTimescales: any;
    };
    avifVersion(): string;
    resultToStr(result: number): any;
    error(error: Error): void;
    free(ptr: number): void;
    UTF8ToString(ptr: number): any;
}
