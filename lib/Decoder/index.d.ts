import { Observer } from "../Observer";
import { DecoderImageData, WorkerAvifDecoderEventMap, DecoderEventMap } from "../types/WorkerMessageType";
export declare class Decoder<M> extends Observer<M> {
    constructor();
}
export declare class WorkerObserver<W, M> extends Decoder<M> {
    private workerListeners;
    worker: Worker;
    constructor(url: string);
    /**
     * 发送事件到Worker线程
     * @param channel
     * @param data
     * @param args
     */
    postMessage<T extends keyof W>(channel: T, data: W[T], ...args: any[]): void;
    /**
     * 为给定的Worker线程事件添加一次性侦听器。
     * @param channel 频道
     * @param handler 事件回调
     * @returns
     */
    onmessageOnce<T extends keyof W>(channel: T, handler: (this: this, ev: W[T]) => void): this;
    /**
     * 清除Worker线程事件
     * @param channel
     * @param handler
     * @returns
     */
    clearOnmessage<T extends keyof W>(channel: T, handler: (data: W[T]) => void): boolean;
    /**
     * 监听Worker线程发送的事件
     * @param channel
     * @param handler
     */
    onmessage<T extends keyof W>(channel: T, handler: (data: W[T]) => void): void;
    private listenOnmessage;
}
export default class LibavifDecoder extends WorkerObserver<WorkerAvifDecoderEventMap, DecoderEventMap> {
    /**
     * 所有帧已成功解码完成
     */
    avifDecoderImageComplete: boolean;
    avifDecoderParseComplete: boolean;
    decoderInitial: boolean;
    decoderVersion: string;
    frames: (DecoderImageData | number)[];
    /**
     * 帧数
     */
    imageCount: number;
    constructor(url: string);
    decoder(arrayBuffer: ArrayBuffer): Promise<boolean>;
    /**
     * 发送图像数据到Worker进行解码
     * @param arrayBuffer
     */
    avifDecoderParse(arrayBuffer: ArrayBuffer): Promise<unknown>;
    avifDecoderImage(): Promise<unknown>;
    private decoderImageData;
}
