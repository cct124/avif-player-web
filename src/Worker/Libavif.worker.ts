import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
import { WorkerEventEmitter } from "../Observer/index";
import {
  AvifDecodeStreamingParse,
  AvifDecoderEventMap,
  AvifDecoderMessageChannel,
  AvifDecoderNextImageData,
  AvifDecoderNthImageData,
  AvifDecoderParseComplete,
  WorkerAvifDecoderCallBackEventMap,
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "../types/WorkerMessageType";
import Libavif from "./Libavif";
import { AVIF_RESULT } from "./type";

self.onmessage = (e) => {
  const res = e.data[0] + e.data[1];
  self.postMessage(res);
};

export default class LibavifWorker extends WorkerEventEmitter<
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderCallBackEventMap,
  AvifDecoderEventMap
> {
  id: string;
  libavif?: Libavif;
  streamingNthImageCallback: (
    data: AvifDecoderNextImageData,
    arrayBuffer?: ArrayBuffer
  ) => void;
  decoderNthImageResult = 0;
  frameIndex = 0;
  constructor() {
    super();
    this.initialAvifDecodeFileWeb();
  }

  async initialAvifDecodeFileWeb() {
    try {
      const AvifDecodeFileWeb = await avifDecodeFileWeb();
      this.libavif = new Libavif(this, AvifDecodeFileWeb);
      this.onmessage(WorkerAvifDecoderMessageChannel.avifDecoderDestroy, () => {
        self.close();
      });

      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderParse,
        ({ id }, arrayBuffer) => {
          if (id && arrayBuffer?.byteLength) {
            if (!this.libavif.decoderPtr) {
              this.libavif.avifDecoderParse(arrayBuffer);
              this.postMessage(
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
      // 解码所有帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderImage,
        ({ id }) => {
          this.libavif.avifDecoderImage(id);
        }
      );
      // 解码指定帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
        ({ id, frameIndex }, arrayBuffer, callback) => {
          const result = this.libavif.avifDecoderNthImage(id, frameIndex);
          if (result instanceof Array) {
            callback(result[0], result[1].buffer);
          }
        }
      );
      // 文件数据流
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer,
        ({ size, done }, arrayBuffer, callback) => {
          const byteLength = this.libavif.streamingArrayBuffer(
            done,
            size,
            arrayBuffer
          );
          this.emit(AvifDecoderMessageChannel.streamingArrayBuffer, {
            byteLength,
          });
          callback<WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer>({
            byteLength,
          });
          // this.avifDecoderStreamingNthImage();
        }
      );
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse,
        (data, arrayBuffer, callback) => {
          this.avifDecodeStreamingParse(callback);
        }
      );
      // 解码指定数据流帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage,
        (data, arrayBuffer, callback) => {
          this.id = data.id;
          this.frameIndex = data.frameIndex;
          this.streamingNthImageCallback = callback;
          if (this.libavif.streamingArrayBufferComplete) {
            this.avifDecoderStreamingNthImage();
          }
        }
      );
      this.postMessage(
        WorkerAvifDecoderMessageChannel.initial,
        this.libavif.avifVersion()
      );
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  avifDecodeStreamingParse(
    callback?: (data: AvifDecoderParseComplete) => void
  ) {
    this.once(AvifDecoderMessageChannel.avifDecoderParseComplete, (data) => {
      callback(data);
    });
    this.libavif.avifDecodeStreamingCreate();
    this.on(AvifDecoderMessageChannel.streamingArrayBuffer, () => {
      this.libavif.updateDownloadedBytes();
      this.libavif.avifDecodeStreamingParse();
    });
  }

  avifDecoderStreamingNthImage() {
    if (this.streamingNthImageCallback) {
      this.libavif.updateDownloadedBytes();
      const result = this.libavif.avifDecoderNthImage(this.id, this.frameIndex);
      if (result instanceof Array) {
        this.streamingNthImageCallback(result[0], result[1].buffer);
        this.streamingNthImageCallback = null;
      } else {
        this.decoderNthImageResult = result;
      }
    }
  }
}

new LibavifWorker();
