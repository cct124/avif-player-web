import { MainEventEmitter } from "../Observer";
import {
  WorkerEventMap,
  WorkerMessageChannel,
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
        decoder.on(WorkerMessageChannel.initial, (version) => {
          resolve(decoder);
        });
      }
    });
  }

  async decoder(id: string, arrayBuffer: ArrayBuffer) {
    const decoder = await this.initialDecoder(id);
    decoder.send(WorkerMessageChannel.submitDecoding, arrayBuffer, [
      arrayBuffer,
    ]);
  }
}
