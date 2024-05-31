export declare enum PlayChannelType {
    frameIndexChange = 1
}
export interface PlayEventMap {
    [PlayChannelType.frameIndexChange]: FrameIndexChangeEvent;
}
export interface FrameIndexChangeEvent {
    /**
     * 帧索引
     */
    index: number;
    /**
     * 当前帧解码时间
     */
    decodeTime: number;
}
