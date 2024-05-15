import { MainEventEmitter } from "../Observer";
import {
  WorkerEventMap,
  WorkerMessageChannel,
} from "../types/WorkerMessageType";
import WorkerManager from "../WorkerManager/index";

export default class DecoderManager {
  workerDecoderUrl: string;
  /**
   * 解码器集合
   */
  decoderWorkers = new WorkerManager<MainEventEmitter<WorkerEventMap>>();
  constructor(workerDecoderUrl: string) {
    this.workerDecoderUrl = workerDecoderUrl;
  }

  async decoder(id: string, arrayBuffer: Uint8Array) {
    if (this.decoderWorkers.has(id)) {
    } else {
      const decoderWorker = new MainEventEmitter<WorkerEventMap>(
        this.workerDecoderUrl
      );
      decoderWorker.on(WorkerMessageChannel.initial, (version) => {
        console.log(version);
      });
    }
  }
}
