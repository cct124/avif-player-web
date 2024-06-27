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
  streamingNthImageCallback: (
    data: AvifDecoderNextImageData,
    arrayBuffer?: ArrayBuffer
  ) => void;
  decoderNthImageResult = 0;
  frameIndex = 0;
  libavifs: Libavif[] = [];
  AvifDecodeFileWeb: any;

  constructor() {
    super();
    this.initialAvifDecodeFileWeb();
  }

  async initialAvifDecodeFileWeb() {
    try {
      this.AvifDecodeFileWeb = await avifDecodeFileWeb();
      this.onmessage(WorkerAvifDecoderMessageChannel.avifDecoderDestroy, () => {
        self.close();
      });

      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderParse,
        ({ sourceId }, arrayBuffer) => {
          if (sourceId && arrayBuffer?.byteLength) {
            const libavif = this.getLibavif(sourceId);
            if (!libavif.decoderPtr) {
              libavif.avifDecoderParse(sourceId, arrayBuffer);
              this.postMessage(
                WorkerAvifDecoderMessageChannel.avifDecoderParseComplete,
                {
                  imageCount: libavif.imageCount,
                  width: libavif.width!,
                  height: libavif.height!,
                  sourceId,
                }
              );
            }
          } else {
            throw new Error(
              `参数错误 sourceId: ${sourceId} arrayBuffer: ${arrayBuffer}`
            );
          }
        }
      );
      // 解码所有帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderImage,
        ({ sourceId }) => {
          const libavif = this.getLibavif(sourceId);
          libavif.avifDecoderImage(sourceId);
        }
      );
      // 解码指定帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
        ({ sourceId, frameIndex }, arrayBuffer, callback) => {
          const libavif = this.getLibavif(sourceId);
          const result = libavif.avifDecoderNthImage(sourceId, frameIndex);
          if (result instanceof Array) {
            callback(result[0], result[1].buffer);
          }
        }
      );
      // 文件数据流
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer,
        ({ size, done, sourceId }, arrayBuffer, callback) => {
          const libavif = this.getLibavif(sourceId);
          const byteLength = libavif.streamingArrayBuffer(
            sourceId,
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
          if (this.streamingNthImageCallback) {
            libavif.updateDownloadedBytes();
            const result = libavif.avifDecoderNthImage(
              sourceId,
              this.frameIndex
            );
            if (result instanceof Array) {
              this.streamingNthImageCallback(result[0], result[1].buffer);
              this.streamingNthImageCallback = null;
            } else {
              this.decoderNthImageResult = result;
            }
          }
          if (this.streamingNthImageCallback) {
            libavif.updateDownloadedBytes();
            const result = libavif.avifDecoderNthImage(
              sourceId,
              this.frameIndex
            );
            if (result instanceof Array) {
              this.streamingNthImageCallback(result[0], result[1].buffer);
              this.streamingNthImageCallback = null;
            } else {
              this.decoderNthImageResult = result;
            }
          }
          // this.avifDecoderStreamingNthImage();
        }
      );
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse,
        (data, arrayBuffer, callback) => {
          const libavif = this.getLibavif(data.sourceId);
          this.avifDecodeStreamingParse(libavif, callback);
        }
      );
      // 解码指定数据流帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage,
        (data, arrayBuffer, callback) => {
          const libavif = this.getLibavif(data.sourceId);
          this.frameIndex = data.frameIndex;
          this.streamingNthImageCallback = callback;
          if (libavif.streamingArrayBufferComplete) {
            this.avifDecoderStreamingNthImage(data.sourceId, libavif);
          }
        }
      );
      this.postMessage(WorkerAvifDecoderMessageChannel.initial, {});
    } catch (error) {
      throw error;
    }
  }

  avifDecodeStreamingParse(
    libavif: Libavif,
    callback?: (data: AvifDecoderParseComplete) => void
  ) {
    this.once(AvifDecoderMessageChannel.avifDecoderParseComplete, (data) => {
      callback(data);
    });
    libavif.avifDecodeStreamingCreate();
    this.on(AvifDecoderMessageChannel.streamingArrayBuffer, () => {
      libavif.updateDownloadedBytes();
      libavif.avifDecodeStreamingParse();
    });
    if (libavif.streamingArrayBufferComplete) {
      libavif.updateDownloadedBytes();
      libavif.avifDecodeStreamingParse();
    }
  }

  avifDecoderStreamingNthImage(sourceId: string, libavif: Libavif) {
    if (this.streamingNthImageCallback) {
      libavif.updateDownloadedBytes();
      const result = libavif.avifDecoderNthImage(sourceId, this.frameIndex);
      if (result instanceof Array) {
        this.streamingNthImageCallback(result[0], result[1].buffer);
        this.streamingNthImageCallback = null;
      } else {
        this.decoderNthImageResult = result;
      }
    }
  }

  getLibavif(sourceId: string) {
    const libavif = this.libavifs.find(
      (libavif) => libavif.sourceId === sourceId
    );
    if (!libavif) {
      const libavif = new Libavif(this, this.AvifDecodeFileWeb);
      this.libavifs.push(libavif);
      return libavif;
    }
    return libavif;
  }
}

new LibavifWorker();
