import { AvifImageTiming } from "./type";
import LibavifWorker from "./Libavif.worker";
export default class Libavif {
    AwsmAvifDecode: any;
    decoderPtr?: number;
    bufferPtr?: number;
    width?: number;
    height?: number;
    avifImageCachePtr?: number;
    index: number;
    imageCount: number;
    decoderNthImage: (id: string, frameIndex: number) => void;
    rbgPtr?: number;
    decodeStats: number[];
    libavifWorker: LibavifWorker;
    constructor(libavifWorker: LibavifWorker, awsmAvifDecode: any);
    avifDecoderParse(arrayBuffer: ArrayBuffer): void;
    avifDecoderNthImage(id: string, frameIndex: number): void;
    avifDecoderImage(id: string): void;
    getImageTiming(timingPtr: number): AvifImageTiming;
    avifVersion(): string;
    resultToStr(result: number): any;
    error(error: Error): void;
    free(ptr: number): void;
    UTF8ToString(ptr: number): any;
    avifSetDecoderMaxThreads(threads?: number): void;
    print(data: any): void;
}
