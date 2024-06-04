import { FrameIndexChangeEvent } from "../AnimationPlayback/type";
export type MessageEventType<T, E> = [T, E, ArrayBuffer | undefined];
export declare enum AvifPlayerWebChannel {
    /**
     * 错误
     */
    error = "error",
    /**
     * 播放
     */
    play = "play",
    /**
     * 播放暂停
     */
    pause = "pause",
    /**
     * 播放结束
     */
    end = "end",
    /**
     * 当前帧发生变化
     */
    frameIndexChange = "frameIndexChange",
    /**
     * 解码器即将销毁
     */
    destroy = "destroy"
}
export interface AvifPlayerWebEventMap {
    [AvifPlayerWebChannel.error]: Error | ErrorEvent;
    [AvifPlayerWebChannel.play]: boolean;
    [AvifPlayerWebChannel.end]: boolean;
    [AvifPlayerWebChannel.pause]: boolean;
    [AvifPlayerWebChannel.frameIndexChange]: FrameIndexChangeEvent;
    [AvifPlayerWebChannel.destroy]: {};
}
