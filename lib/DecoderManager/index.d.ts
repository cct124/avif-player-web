import { DecoderEventMap } from "../types/WorkerMessageType";
import { Decoder } from "../Decoder/index";
import WorkerManager from "../WorkerManager/index";
type DecoderType = Decoder<DecoderEventMap>;
export default class DecoderManager {
    workerDecoderUrl: string;
    /**
     * 解码器集合
     */
    decoders: WorkerManager<DecoderType>;
    constructor(workerDecoderUrl: string);
    initialDecoder(id: string): Promise<DecoderType>;
    decoder(id: string): Promise<DecoderType>;
}
export {};
