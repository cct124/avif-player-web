import { WorkerAvifDecoderEventMap } from "../types/WorkerMessageType";
import { WorkerEventEmitter } from "../Observer/index";
import { AvifImageTiming } from "./type";
export default class Libavif extends WorkerEventEmitter<WorkerAvifDecoderEventMap> {
    AwsmAvifDecode: any;
    decoderPtr?: number;
    bufferPtr?: number;
    avifImageCachePtr: number;
    index: number;
    imageCount: number;
    timingCache: Map<string, AvifImageTiming[]>;
    constructor(awsmAvifDecode: any);
    avifDecoderParse(arrayBuffer: ArrayBuffer): void;
    avifDecoderNthImage(id: string, frameIndex: number): void;
    avifDecoderNthImageResult(id: string, imagePtr: number, timing: AvifImageTiming, index: number, t1: number): void;
    avifDecoderImage(id: string): void;
    getImageTiming(timingPtr: number): AvifImageTiming;
    avifVersion(): string;
    avifInitializeCacheEntry(id: string, count: number): void;
    avifGetCacheImage(id: string, index: number): number;
    avifCacheImage(id: string, image: number, index: number): void;
    resultToStr(result: number): any;
    error(error: Error): void;
    free(ptr: number): void;
    UTF8ToString(ptr: number): any;
}
