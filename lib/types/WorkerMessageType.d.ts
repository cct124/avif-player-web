export declare enum WorkerMessageChannel {
    /**
     * worker解码器初始化完成
     */
    initial = 0,
    /**
     * 提交Uint8Array数据到worker线程解码
     */
    submitDecoding = 1
}
export interface WorkerEventMap {
    [WorkerMessageChannel.submitDecoding]: Uint8Array;
    [WorkerMessageChannel.initial]: string;
}
