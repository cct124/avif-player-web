import AvifPlayerWeb from "../AvifPlayer";
import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { DecoderEventMap } from "../types/WorkerMessageType";
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
    framesDelay: number[];
    update: (diff: number) => void;
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
    awaitNextFrameDecode(decoder: D): Promise<unknown>;
    webglInit(gl: WebGLRenderingContext): void;
    renderWebgl(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    renderCanvas(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    sleep(delay: number): Promise<number | void>;
    timeout(callback: (elapsed: number) => void, ms?: number): void;
    destroy(): void;
}
