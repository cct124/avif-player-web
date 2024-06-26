import { FrameIndexChangeEvent } from "../AnimationPlayback/type";
export type MessageEventType<T, E> = [
    T,
    E,
    ArrayBuffer | undefined,
    number | undefined
];
/**
 * id
 */
export type AID_TYPE = string | number;
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
    destroy = "destroy",
    /**
     * 图像数据解析完成
     */
    parse = "parse"
}
export interface AvifPlayerWebEventMap {
    [AvifPlayerWebChannel.error]: Error | ErrorEvent;
    [AvifPlayerWebChannel.play]: PlayData;
    [AvifPlayerWebChannel.end]: PlayData;
    [AvifPlayerWebChannel.pause]: boolean;
    [AvifPlayerWebChannel.frameIndexChange]: FrameIndexChangeEvent;
    [AvifPlayerWebChannel.destroy]: {};
    [AvifPlayerWebChannel.parse]: AvifDataParse;
}
export interface AnimationID {
    /**
     * 动画id
     */
    id: AID_TYPE;
}
export interface AnimationOption extends AnimationID {
}
export interface PlayData extends AnimationOption {
}
export interface AvifPlayerSourceType extends AnimationOption {
    /**
     * 资源路径
     */
    url: string;
    /**
     * 循环播放次数，0表示无限循环播放
     */
    loop: number;
    /**
     * 文件Uint8Array数据
     */
    arrayBuffer?: ArrayBuffer;
}
export interface PlayOptions extends AnimationOption {
    /**
     * 帧索引
     */
    index?: number;
}
export interface AvifDataParse extends AnimationOption {
    /**
     * 图像宽度
     */
    width: number;
    /**
     * 图像高度
     */
    height: number;
}
