import { FrameIndexChangeEvent } from "../AnimationPlayback/type";
export type MessageEventType<T, E> = [T, E, ArrayBuffer | undefined];
export declare enum AvifPlayerWebChannel {
    error = "error",
    play = "play",
    pause = "pause",
    end = "end",
    frameIndexChange = "frameIndexChange"
}
export interface AvifPlayerWebEventMap {
    [AvifPlayerWebChannel.error]: Error | ErrorEvent;
    [AvifPlayerWebChannel.play]: boolean;
    [AvifPlayerWebChannel.end]: boolean;
    [AvifPlayerWebChannel.pause]: boolean;
    [AvifPlayerWebChannel.frameIndexChange]: FrameIndexChangeEvent;
}
