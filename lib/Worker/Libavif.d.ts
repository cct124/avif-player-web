import { AvifImageTiming } from "./type";
import LibavifWorker from "./Libavif.worker";
export interface ImageDataInfo {
    id: string;
    timescale: number;
    pts: number;
    ptsInTimescales: number;
    duration: number;
    durationInTimescales: number;
    frameIndex: number;
    width: any;
    height: any;
    depth: any;
    decodeTime: number;
}
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
    avifIOPtr: number;
    streamingArrayBufferDone: boolean;
    streamingArrayBufferSize: number;
    streamingArrayBufferOffset: number;
    avifDecoderParseComplete: boolean;
    streamingArrayBufferComplete: boolean;
    constructor(libavifWorker: LibavifWorker, awsmAvifDecode: any);
    /**
     * 数据流写入内存
     * @param done
     * @param size
     * @param arrayBuffer
     * @returns
     */
    streamingArrayBuffer(done: boolean, size: number, arrayBuffer: ArrayBuffer): number;
    /**
     * 解析avif数据流，调用这个方法时必须先调用`streamingArrayBuffer`
     */
    avifDecodeStreamingCreate(): void;
    updateDownloadedBytes(): void;
    avifDecodeStreamingParse(): void;
    avifDecoderParse(arrayBuffer: ArrayBuffer): void;
    avifDecoderNextImage(id: string, frameIndex: number): any;
    avifDecoderNthImage(id: string, frameIndex: number): [ImageDataInfo, Uint8ClampedArray] | number;
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
