import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { PlayOptions } from "../types/PlayType";
import { DecoderEventMap } from "../types/WorkerMessageType";
import { PlayChannelType } from "./type";
export default class Play<D extends Decoder<DecoderEventMap>> extends Observer<PlayChannelType> {
    option: PlayOptions;
    decoder?: D;
    canvas: HTMLCanvasElement;
    ctx2d?: CanvasRenderingContext2D;
    gl?: WebGLRenderingContext;
    /**
     * 当前帧索引
     */
    index: number;
    lastTimestamp: number;
    render: (arrayBuffer: ArrayBuffer, width: number, height: number) => void;
    constructor(canvas: HTMLCanvasElement, option?: PlayOptions);
    setDecoder(decoder: D): void;
    play(): void;
    update(decoder: D): Promise<void>;
    awaitNextFrameDecode(decoder: D): Promise<unknown>;
    renderWebgl(arrayBuffer: ArrayBuffer, width: number, height: number): void;
    renderCanvas(arrayBuffer: ArrayBuffer, width: number, height: number): void;
    sleep(delay: number): Promise<number>;
}