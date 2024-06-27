import { AvifPlayerSourceType } from "../types";
import { WorkerAvifDecoderEventMap, DecoderEventMap, DecoderImageData, WorkerAvifDecoderCallBackEventMap } from "../types/WorkerMessageType";
import { MainEventEmitter } from "./index";
export declare class LibavifDecoder extends MainEventEmitter<WorkerAvifDecoderEventMap, WorkerAvifDecoderCallBackEventMap, DecoderEventMap> {
    /**
     * 启用流数据解码
     */
    streaming: boolean;
    decoderNthImage: (sourceId: string, frameIndex: number) => Promise<DecoderImageData>;
    /**
     *
     * @param url worker连接
     * @param sourceId 唯一资源标识
     */
    constructor(worker: Worker, sources: AvifPlayerSourceType[], streaming?: boolean);
    /**
     * 解析&解码操作
     * @param arrayBuffer
     * @returns
     */
    decoderParse(sourceId: string, arrayBuffer?: ArrayBuffer): Promise<boolean>;
    /**
     * 解码指定帧数据
     *
     * 数据流模式
     * @param frameIndex
     * @returns
     */
    decoderStreamingNthImage(sourceId: string, frameIndex: number): Promise<DecoderImageData>;
    /**
     * 解码指定帧数据
     * @param frameIndex
     * @returns
     */
    decoderResultNthImage(sourceId: string, frameIndex: number): Promise<DecoderImageData>;
    /**
     * 发送图像数据到Worker进行解码
     * @param arrayBuffer
     */
    avifDecoderParse(sourceId: string, arrayBuffer?: ArrayBuffer): Promise<unknown>;
    avifDecoderAllImage(sourceId: string): void;
    clearNthImageCallback(): void;
    /**
     * 销毁解码器
     */
    destroy(): void;
    streamingArrayBuffer(sourceId: string, done: boolean, arrayBuffer: Uint8Array, size: number): Promise<number>;
}
