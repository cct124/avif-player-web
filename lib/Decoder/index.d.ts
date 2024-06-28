import { Observer } from "../Observer";
import { AID_TYPE } from "../types";
import { DecoderEventMap, DecoderImageData, ResourceSymbol } from "../types/WorkerMessageType";
declare abstract class DecoderAbstract {
    /**
     * 进行解码操作
     * @param arrayBuffer
     */
    abstract decoderParse(id: AID_TYPE, arrayBuffer: ArrayBuffer): Promise<boolean>;
    abstract decoderNthImage(id: AID_TYPE, frameIndex: number): Promise<DecoderImageData>;
    /**
     * 查找资源对象
     * @param id
     */
    abstract findSource(id: AID_TYPE): SourceType;
}
export interface SourceType extends ResourceSymbol {
    /**
     * 所有帧已成功解码完成
     */
    decoderImageComplete: boolean;
    /**
     * 文件解析完成
     */
    decoderParseComplete: boolean;
    /**
     * 帧数
     */
    imageCount: number;
    /**
     * 图像宽度
     */
    width: number;
    /**
     * 图像高度
     */
    height: number;
}
export declare class Decoder<M> extends Observer<M> implements DecoderAbstract {
    /**
     * 解码器初始化完成
     */
    decoderInitial: boolean;
    /**
     * 解码器版本
     */
    decoderVersion: string;
    sources: SourceType[];
    /**
     * 图像宽度
     */
    width: number;
    /**
     * 图像高度
     */
    height: number;
    constructor();
    findSource(id: AID_TYPE): SourceType;
    decoderParse(id: AID_TYPE, arrayBuffer: ArrayBuffer): Promise<boolean>;
    decoderNthImage(id: AID_TYPE, frameIndex: number): Promise<DecoderImageData>;
    avifDecoderAllImage(id: AID_TYPE): void;
    /**
     * 删除所有`NthImage`解码回调
     */
    clearNthImageCallback(): void;
    streamingArrayBuffer(id: string, done: boolean, arrayBuffer: Uint8Array, size: number): void;
}
export declare class MainEventEmitter<W, C, M extends DecoderEventMap> extends Decoder<M> {
    private workerListeners;
    private callbackUniqueIds;
    worker: Worker;
    constructor(worker: Worker);
    /**
     * 发送事件到Worker线程
     * @param channel
     * @param data
     * @param arrayBuffer
     * @param callback 可选的回调函数
     */
    postMessage<A extends keyof C, T extends keyof W = keyof W>(channel: T | string | number, data: W[T], arrayBuffer?: ArrayBuffer, callback?: (data: C[A], arrayBuffer?: ArrayBuffer) => void): void;
    /**
     * 为给定的Worker线程事件添加一次性侦听器。
     * @param channel 频道
     * @param handler 事件回调
     * @returns
     */
    onmessageOnce<T extends keyof W>(channel: T | string | number, handler: (this: this, ev: W[T], arrayBuffer?: ArrayBuffer) => void): this;
    /**
     * 清除Worker线程事件
     * @param channel
     * @param handler
     * @returns
     */
    clearOnmessage<T extends keyof W>(channel: T | string | number, handler: (data: W[T]) => void): boolean;
    /**
     * 监听Worker线程发送的事件
     * @param channel
     * @param handler
     */
    onmessage<T extends keyof W>(channel: T | string | number, handler: (data: W[T], arrayBuffer?: ArrayBuffer) => void): void;
    private listenOnmessage;
    setDecoder(worker: Worker): void;
    clearOnmessageAll<T extends keyof W>(channel?: T | string | number): void;
    clearCallback<T extends keyof W>(channel?: T): void;
}
export {};
