export declare enum WorkerMessageChannel {
    error = 0,
    /**
     * worker解码器初始化完成
     */
    initial = 1,
    /**
     * 提交Uint8Array数据到worker线程解码
     */
    submitDecoding = 2,
    decoderImageData = 3
}
export interface WorkerEventMap {
    [WorkerMessageChannel.submitDecoding]: ArrayBuffer;
    [WorkerMessageChannel.decoderImageData]: DecoderImageData;
    [WorkerMessageChannel.initial]: string;
    [WorkerMessageChannel.error]: Error;
}
export interface DecoderImageData {
    /**
     * 帧索引
     */
    index: number;
    /**
     * 图像宽度
     */
    width: string;
    /**
     * 图像高度
     */
    height: string;
    /**
     * 像素位深度[8, 10, 12, 16]。如果深度大于8，则像素在内部必须是uint16_t类型。
     */
    depth: number;
    /**
     * 像素集合
     */
    pixels: ArrayBuffer;
}
