import Decoder from "../Decoder";
import { Observer } from "../Observer";
import { DecoderChannel } from "../types/WorkerMessageType";
import { PlayChannelType } from "./type";
export default class Play<D extends Observer<DecoderChannel>> extends Observer<PlayChannelType> {
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
    update(decoder: Decoder): Promise<void>;
    awaitNextFrameDecode(decoder: Decoder): Promise<unknown>;
    renderCanvas(arrayBuffer: ArrayBuffer, width: number, height: number): void;
}
