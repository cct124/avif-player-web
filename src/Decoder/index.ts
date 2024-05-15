import { MainEventEmitter } from "../Observer";
import {
  DecoderImageData,
  WorkerEventMap,
  WorkerMessageChannel,
} from "../types/WorkerMessageType";

export default class Decoder extends MainEventEmitter<WorkerEventMap> {
  constructor(url: string) {
    super(url);
    this.on(WorkerMessageChannel.decoderImageData, this.decoderImageData);
  }

  decoderImageData(data: DecoderImageData) {
    console.log(data.pixels.byteLength);
  }
}
