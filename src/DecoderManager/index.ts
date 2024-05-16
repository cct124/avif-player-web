import { MainEventEmitter } from "../Observer";
import {
  DecoderImageData,
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "../types/WorkerMessageType";
import Decoder from "../Decoder";
import WorkerManager from "../WorkerManager/index";

export default class DecoderManager {
  workerDecoderUrl: string;
  /**
   * 解码器集合
   */
  decoders = new WorkerManager<Decoder>();
  constructor(workerDecoderUrl: string) {
    this.workerDecoderUrl = workerDecoderUrl;
  }

  initialDecoder(id: string) {
    return new Promise<Decoder>((resolve, reject) => {
      if (this.decoders.has(id)) {
        resolve(this.decoders.get(id)!);
      } else {
        const decoder = new Decoder(this.workerDecoderUrl);
        decoder.onmessage(WorkerAvifDecoderMessageChannel.initial, (version) => {
          this.decoders.add(id, decoder);
          resolve(decoder);
        });
      }
    });
  }

  async decoder(id: string) {
    return new Promise<Decoder>(async (resolve, reject) => {
      const decoder = await this.initialDecoder(id);
      resolve(decoder);
    });
  }
}
