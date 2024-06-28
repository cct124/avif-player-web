import { ResourceSymbol } from "../types/WorkerMessageType";
import { AvifImageTiming } from "./type";
import LibavifWorker from "./Libavif.worker";
import { AID_TYPE } from "../types";
export interface ImageDataInfo extends ResourceSymbol {
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
    id: AID_TYPE;
    AwsmAvifDecode: any;
    decoderPtr?: number;
    bufferPtr?: number;
    width?: number;
    height?: number;
    avifImageCachePtr?: number;
    index: number;
    imageCount: number;
    decoderNthImage: (id: AID_TYPE, frameIndex: number) => void;
    rbgPtr?: number;
    decodeStats: number[];
    libavifWorker: LibavifWorker;
    avifIOPtr: number;
    streamingArrayBufferDone: boolean;
    streamingArrayBufferSize: number;
    streamingArrayBufferOffset: number;
    avifDecoderParseComplete: boolean;
    streamingArrayBufferComplete: boolean;
    bufferSize: number;
    constructor(libavifWorker: LibavifWorker, awsmAvifDecode: any, decoderPtr?: number);
    avifDecoderCreate(): any;
    /**
     * 数据流写入内存
     * @param done
     * @param size
     * @param arrayBuffer
     * @returns
     */
    streamingArrayBuffer(id: AID_TYPE, done: boolean, size: number, arrayBuffer: ArrayBuffer): number;
    /**
     * 解析avif数据流，调用这个方法时必须先调用`streamingArrayBuffer`
     */
    avifDecodeStreamingCreate(): number;
    updateDownloadedBytes(): void;
    avifDecodeStreamingParse(): void;
    avifDecoderParse(id: AID_TYPE, arrayBuffer?: ArrayBuffer): number;
    avifDecoderNextImage(frameIndex: number): any;
    avifDecoderNthImage(id: AID_TYPE, frameIndex: number): [ImageDataInfo, Uint8ClampedArray] | number;
    avifDecoderImage(id: AID_TYPE): void;
    getImageTiming(timingPtr: number): AvifImageTiming;
    avifVersion(): string;
    resultToStr(result: number): any;
    error(error: Error): void;
    free(ptr: number): void;
    UTF8ToString(ptr: number): any;
    avifSetDecoderMaxThreads(threads?: number): void;
    print(data: any): void;
}
