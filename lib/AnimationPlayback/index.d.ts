import SoftAvifWeb from "..";
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
    softAvifWeb: SoftAvifWeb;
    render: (arrayBuffer: Uint8ClampedArray, width: number, height: number) => void;
    constructor(softAvifWeb: SoftAvifWeb, canvas: HTMLCanvasElement, decoder: D, option?: PlayOptions);
    initRender(): void;
    play(index?: number): void;
    pause(): void;
    update(decoder: D): Promise<void>;
    awaitNextFrameDecode(decoder: D): Promise<unknown>;
    webglInit(gl: WebGLRenderingContext): void;
    renderWebgl(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    renderCanvas(uint8ClampedArray: Uint8ClampedArray, width: number, height: number): void;
    sleep(delay: number): Promise<number>;
}
