import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
import { WorkerEventEmitter } from "../Observer/index";
import {
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "../types/WorkerMessageType";
import Libavif from "./Libavif";

self.onmessage = (e) => {
  const res = e.data[0] + e.data[1];
  self.postMessage(res);
};

export default class LibavifWorker extends WorkerEventEmitter<WorkerAvifDecoderEventMap> {
  libavif?: Libavif;
  constructor() {
    super();
    this.initialAvifDecodeFileWeb();
  }

  async initialAvifDecodeFileWeb() {
    try {
      const AvifDecodeFileWeb = await avifDecodeFileWeb();
      this.libavif = new Libavif(this, AvifDecodeFileWeb);
      this.on(WorkerAvifDecoderMessageChannel.avifDecoderDestroy, () => {
        self.close();
      });

      this.on(
        WorkerAvifDecoderMessageChannel.avifDecoderParse,
        ({ id }, arrayBuffer) => {
          if (id && arrayBuffer?.byteLength) {
            if (!this.libavif.decoderPtr) {
              this.libavif.avifDecoderParse(arrayBuffer);
              this.send(
                WorkerAvifDecoderMessageChannel.avifDecoderParseComplete,
                {
                  imageCount: this.libavif.imageCount,
                  width: this.libavif.width!,
                  height: this.libavif.height!,
                }
              );
            }
          } else {
            throw new Error(`参数错误 id: ${id} arrayBuffer: ${arrayBuffer}`);
          }
        }
      );
      this.on(WorkerAvifDecoderMessageChannel.avifDecoderImage, ({ id }) => {
        this.libavif.avifDecoderImage(id);
      });
      this.on(
        WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
        ({ id, frameIndex }) => {
          this.libavif.avifDecoderNthImage(id, frameIndex);
        }
      );
      this.send(
        WorkerAvifDecoderMessageChannel.initial,
        this.libavif.avifVersion()
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }
}

new LibavifWorker();
