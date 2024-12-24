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
import { AID_TYPE } from "../types/index.js";
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
  decoderPtr: number;
  constructor() {
    super();
    this.onmessage(
      WorkerAvifDecoderMessageChannel.initialDecode,
      async ({ decoderStr }) => {
        if (decoderStr) {
          this.AvifDecodeFileWeb = await initialDecode(decoderStr);
        } else {
          this.AvifDecodeFileWeb = await avifDecodeFileWeb();
        }
        this.initialAvifDecodeFileWeb();
      }
    );
  }

  async initialAvifDecodeFileWeb() {
    try {
      this.onmessage(WorkerAvifDecoderMessageChannel.avifDecoderDestroy, () => {
        self.close();
      });

      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderParse,
        ({ id }, arrayBuffer, callback) => {
          const libavif = this.getLibavif(id);
          if (
            (id !== undefined && arrayBuffer?.byteLength) ||
            libavif.avifDecoderParseComplete
          ) {
            const decoderPtr = libavif.avifDecoderParse(id, arrayBuffer);
            if (!this.decoderPtr) this.decoderPtr = decoderPtr;
            callback({
              imageCount: libavif.imageCount,
              width: libavif.width!,
              height: libavif.height!,
              id,
            });
          } else {
            throw new Error(`参数错误 id: ${id} arrayBuffer: ${arrayBuffer}`);
          }
        }
      );
      // 解码所有帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderImage,
        ({ id }) => {
          const libavif = this.getLibavif(id);
          libavif.avifDecoderImage(id);
        }
      );
      // 解码指定帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
        ({ id, frameIndex }, arrayBuffer, callback) => {
          const libavif = this.getLibavif(id);
          const result = libavif.avifDecoderNthImage(id, frameIndex);
          if (result instanceof Array) {
            callback(result[0], result[1].buffer);
          }
        }
      );
      // 文件数据流
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer,
        ({ size, done, id }, arrayBuffer, callback) => {
          const libavif = this.getLibavif(id);
          const byteLength = libavif.streamingArrayBuffer(
            id,
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
            const result = libavif.avifDecoderNthImage(id, this.frameIndex);
            if (result instanceof Array) {
              this.streamingNthImageCallback(result[0], result[1].buffer);
              this.streamingNthImageCallback = null;
            } else {
              this.decoderNthImageResult = result;
            }
          }
          if (this.streamingNthImageCallback) {
            libavif.updateDownloadedBytes();
            const result = libavif.avifDecoderNthImage(id, this.frameIndex);
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
          const libavif = this.getLibavif(data.id);
          this.avifDecodeStreamingParse(libavif, callback);
        }
      );
      // 解码指定数据流帧数据
      this.onmessage(
        WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage,
        (data, arrayBuffer, callback) => {
          const libavif = this.getLibavif(data.id);
          this.frameIndex = data.frameIndex;
          this.streamingNthImageCallback = callback;
          if (libavif.streamingArrayBufferComplete) {
            this.avifDecoderStreamingNthImage(data.id, libavif);
          }
        }
      );
      this.postMessage(WorkerAvifDecoderMessageChannel.initialComplete, {});
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
    const decoderPtr = libavif.avifDecodeStreamingCreate();
    if (!this.decoderPtr) this.decoderPtr = decoderPtr;
    this.on(AvifDecoderMessageChannel.streamingArrayBuffer, () => {
      libavif.updateDownloadedBytes();
      libavif.avifDecodeStreamingParse();
    });
    if (libavif.streamingArrayBufferComplete) {
      libavif.updateDownloadedBytes();
      libavif.avifDecodeStreamingParse();
    }
  }

  avifDecoderStreamingNthImage(id: AID_TYPE, libavif: Libavif) {
    if (this.streamingNthImageCallback) {
      libavif.updateDownloadedBytes();
      const result = libavif.avifDecoderNthImage(id, this.frameIndex);
      if (result instanceof Array) {
        this.streamingNthImageCallback(result[0], result[1].buffer);
        this.streamingNthImageCallback = null;
      } else {
        this.decoderNthImageResult = result;
      }
    }
  }

  getLibavif(id: AID_TYPE) {
    const libavif = this.libavifs.find((libavif) => libavif.id === id);
    if (!libavif) {
      const libavif = new Libavif(
        this,
        this.AvifDecodeFileWeb,
        this.decoderPtr
      );
      this.libavifs.push(libavif);
      return libavif;
    }
    return libavif;
  }
}

async function initialDecode(script: string) {
  const dynamicFunction = new Function(script);
  return await dynamicFunction()();
}

new LibavifWorker();
