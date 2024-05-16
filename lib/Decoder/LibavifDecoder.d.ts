import { WorkerAvifDecoderEventMap, DecoderEventMap } from "../types/WorkerMessageType";
import { WorkerObserver } from "./index";
export declare class LibavifDecoder extends WorkerObserver<WorkerAvifDecoderEventMap, DecoderEventMap> {
    constructor(url: string);
    /**
     * 解析&解码操作
     * @param arrayBuffer
     * @returns
     */
    decoder(arrayBuffer: ArrayBuffer): Promise<boolean>;
    /**
     * 发送图像数据到Worker进行解码
     * @param arrayBuffer
     */
    avifDecoderParse(arrayBuffer: ArrayBuffer): Promise<unknown>;
    /**
     * 解码所有帧数据
     *
     * 调用此函数前先调用`avifDecoderParse`
     * @returns
     */
    avifDecoderImage(): Promise<unknown>;
    private decoderImageData;
}
