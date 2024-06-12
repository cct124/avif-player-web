import AvifPlayerWeb from "../AvifPlayer";
import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { DecoderImageData, DecoderEventMap } from "../types/WorkerMessageType";
import { PlayEventMap, PlayOptions } from "./type";
export default class AnimationPlayback<D extends Decoder<DecoderEventMap>> extends Observer<PlayEventMap> {
    playing: boolean;
    paused: boolean;
    option: PlayOptions;
    decoder: D;
    canvas: HTMLCanvasElement;
    ctx2d?: CanvasRenderingContext2D;
    gl?: WebGLRenderingContext;
    /**
     * 当前帧索引
     */
    index: number;
    lastTimestamp: number;
    renderStats: number[];
    loopCount: number;
    AvifPlayerWeb: AvifPlayerWeb;
    framesCancel: number[];
    pauseIndex: number;
    pts: number;
    frameIndex: number;
    framesPerformanceDelay: number[];
    update: (diff: number) => void;
    /**
     * 当前调用栈缓冲大小
     */
    arrayBuffStackSize: number;
    /**
     * 缓冲区数组长度，这个值是根据 `option.arrayBuffSize`配置的缓冲区大小计算的，不小于1
     */
    arrayBuffLength: number;
    render: (arrayBuffer: Uint8ClampedArray, width: number, height: number) => void;
    constructor(AvifPlayerWeb: AvifPlayerWeb, canvas: HTMLCanvasElement, decoder: D, option?: PlayOptions);
    setDecoder(decoder: D): void;
    initRender(): void;
    play(index?: number): void;
    resetFramesStatus(imageCount: number): void;
    /**
     * 暂停播放
     */
    pause(index?: number): void;
    updateAsync(diff?: number): Promise<void>;
    updateSync(): Promise<void>;
    decoderNthImageArrayBuff(index: number): Promise<DecoderImageData>;
    updateArrayBuff(): Promise<boolean>;
    awaitNextFrameDecode(decoder: D): Promise<unknown>;
    webglInit(gl: WebGLRenderingContext): void;
    renderWebgl(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    renderCanvas(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    sleep(delay: number): Promise<number>;
    timeout(callback: (time: number) => void, ms?: number): void;
    destroy(): void;
}
