import { PlaybackOptions } from "./type";
import Libavif from "./Libavif";
import MianWorker from "./main.worker";
export default class Playback {
    playing: boolean;
    paused: boolean;
    option: PlaybackOptions;
    libavif: Libavif;
    mainWorker: MianWorker;
    /**
     * 当前帧索引
     */
    index: number;
    lastTimestamp: number;
    renderStats: number[];
    loopCount: number;
    constructor(mainWorker: MianWorker, libavif: Libavif, option?: PlaybackOptions);
    setLoop(loop: number): void;
    play(index?: number, arrayBuffer?: ArrayBuffer): void;
    /**
     * 暂停播放
     */
    pause(index?: number): void;
    update(): Promise<void>;
    sleep(delay: number): Promise<number>;
}
