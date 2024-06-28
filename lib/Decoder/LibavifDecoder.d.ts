import { AID_TYPE, AvifPlayerSourceType } from "../types";
import { WorkerAvifDecoderEventMap, DecoderEventMap, DecoderImageData, WorkerAvifDecoderCallBackEventMap } from "../types/WorkerMessageType";
import { MainEventEmitter } from "./index";
export declare class LibavifDecoder extends MainEventEmitter<WorkerAvifDecoderEventMap, WorkerAvifDecoderCallBackEventMap, DecoderEventMap> {
    /**
     * 启用流数据解码
     */
    streaming: boolean;
    decoderNthImage: (id: AID_TYPE, frameIndex: number) => Promise<DecoderImageData>;
    /**
     *
     * @param url worker连接
     * @param sources 资源对象
     * @param streaming 是否启用数据流解码
     */
    constructor(worker: Worker, sources: AvifPlayerSourceType[], streaming?: boolean);
    /**
     * 解析&解码操作
     * @param arrayBuffer
     * @returns
     */
    decoderParse(id: AID_TYPE, arrayBuffer?: ArrayBuffer): Promise<boolean>;
    /**
     * 解码指定帧数据
     *
     * 数据流模式
     * @param frameIndex
     * @returns
     */
    decoderStreamingNthImage(id: AID_TYPE, frameIndex: number): Promise<DecoderImageData>;
    /**
     * 解码指定帧数据
     * @param frameIndex
     * @returns
     */
    decoderResultNthImage(id: AID_TYPE, frameIndex: number): Promise<DecoderImageData>;
    /**
     * 发送图像数据到Worker进行解码
     * @param arrayBuffer
     */
    avifDecoderParse(id: AID_TYPE, arrayBuffer?: ArrayBuffer): Promise<unknown>;
    avifDecoderAllImage(id: AID_TYPE): void;
    clearNthImageCallback(): void;
    /**
     * 销毁解码器
     */
    destroy(): void;
    streamingArrayBuffer(id: AID_TYPE, done: boolean, arrayBuffer: Uint8Array, size: number): Promise<number>;
}
