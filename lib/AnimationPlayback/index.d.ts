import AvifPlayerWeb from "../AvifPlayer";
import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { PlayOptions } from "../types/PlayType";
import { DecoderEventMap } from "../types/WorkerMessageType";
import { PlayEventMap } from "./type";
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
    framesStatus: [Promise<any>, (value?: any) => void][];
    framesCancel: number[];
    pauseIndex: number;
    pts: number;
    frameIndex: number;
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
    update(diff?: number): Promise<void>;
    awaitNextFrameDecode(decoder: D): Promise<unknown>;
    webglInit(gl: WebGLRenderingContext): void;
    renderWebgl(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    renderCanvas(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    sleep(delay: number, index: number): Promise<number | void>;
    timeout(callback: (elapsed: number) => void, ms: number, index: number): void;
}
