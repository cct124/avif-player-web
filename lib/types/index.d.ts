import { FrameIndexChangeEvent } from "../AnimationPlayback/type";
export type MessageEventType<T, E> = [T, E, ArrayBuffer | undefined];
export declare enum SoftAvifWebChannel {
    error = "error",
    play = "play",
    pause = "pause",
    end = "end",
    frameIndexChange = "frameIndexChange"
}
export interface SoftAvifWebEventMap {
    [SoftAvifWebChannel.error]: Error | ErrorEvent;
    [SoftAvifWebChannel.play]: boolean;
    [SoftAvifWebChannel.end]: boolean;
    [SoftAvifWebChannel.pause]: boolean;
    [SoftAvifWebChannel.frameIndexChange]: FrameIndexChangeEvent;
}
