import { WorkerAvifDecoderEventMap, DecoderEventMap, DecoderImageData } from "../types/WorkerMessageType";
import { MainEventEmitter } from "./index";
export declare class LibavifDecoder extends MainEventEmitter<WorkerAvifDecoderEventMap, DecoderEventMap> {
    /**
     * 唯一资源标识
     */
    id: string;
    /**
     *
     * @param url worker连接
     * @param id 唯一资源标识
     */
    constructor(worker: Worker, id: string);
    /**
     * 解析&解码操作
     * @param arrayBuffer
     * @returns
     */
    decoderParse(arrayBuffer: ArrayBuffer): Promise<boolean>;
    /**
     * 解码指定帧数据
     * @param frameIndex
     * @returns
     */
    decoderNthImage(frameIndex: number): Promise<DecoderImageData>;
    /**
     * 发送图像数据到Worker进行解码
     * @param arrayBuffer
     */
    avifDecoderParse(arrayBuffer: ArrayBuffer): Promise<unknown>;
    avifDecoderAllImage(): void;
    clearNthImageMessage(): void;
    /**
     * 销毁解码器
     */
    destroy(): void;
}
