import {
  DecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "../types/WorkerMessageType";
import { Decoder } from "../Decoder/index";
import { LibavifDecoder } from "../Decoder/LibavifDecoder";
import WorkerManager from "../WorkerManager/index";

type DecoderType = Decoder<DecoderEventMap>;
export default class DecoderManager {
  workerDecoderUrl: string;
  /**
   * 解码器集合
   */
  decoders = new WorkerManager<DecoderType>();
  constructor(workerDecoderUrl: string) {
    this.workerDecoderUrl = workerDecoderUrl;
  }

  initialDecoder(id: string) {
    return new Promise<DecoderType>((resolve, reject) => {
      if (this.decoders.has(id)) {
        resolve(this.decoders.get(id)!);
      } else {
        const decoder = new LibavifDecoder(this.workerDecoderUrl, id);
        decoder.onmessage(
          WorkerAvifDecoderMessageChannel.initial,
          (version) => {
            this.decoders.add(id, decoder);
            resolve(decoder);
          }
        );
      }
    });
  }

  async decoder(id: string) {
    return new Promise<DecoderType>(async (resolve, reject) => {
      const decoder = await this.initialDecoder(id);
      resolve(decoder);
    });
  }
}
