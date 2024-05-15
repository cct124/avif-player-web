import Decoder from "../Decoder";
import WorkerManager from "../WorkerManager/index";
export default class DecoderManager {
    workerDecoderUrl: string;
    /**
     * 解码器集合
     */
    decoders: WorkerManager<Decoder>;
    constructor(workerDecoderUrl: string);
    initialDecoder(id: string): Promise<Decoder>;
    decoder(id: string, arrayBuffer: ArrayBuffer): Promise<void>;
}
