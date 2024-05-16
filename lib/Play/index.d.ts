import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { DecoderEventMap } from "../types/WorkerMessageType";
import { PlayChannelType } from "./type";
export default class Play<D extends Decoder<DecoderEventMap>> extends Observer<PlayChannelType> {
    decoder?: D;
    canvas: HTMLCanvasElement;
    context: CanvasRenderingContext2D;
    /**
     * 当前帧索引
     */
    index: number;
    lastTimestamp: number;
    constructor(canvas: HTMLCanvasElement);
    setDecoder(decoder: D): void;
    play(): void;
    update(decoder: D): Promise<void>;
    awaitNextFrameDecode(decoder: D): Promise<unknown>;
    renderCanvas(arrayBuffer: ArrayBuffer, width: number, height: number): void;
    sleep(delay: number): Promise<number>;
}
