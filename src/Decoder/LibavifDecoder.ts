import { AvifPlayerSourceType } from "../types";
import {
  WorkerAvifDecoderMessageChannel,
  WorkerAvifDecoderEventMap,
  DecoderEventMap,
  DecoderImageData,
  DecoderChannel,
  AvifDecoderNextImageData,
  WorkerAvifDecoderCallBackEventMap,
} from "../types/WorkerMessageType";
import { MainEventEmitter } from "./index";

export class LibavifDecoder extends MainEventEmitter<
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderCallBackEventMap,
  DecoderEventMap
> {
  /**
   * 启用流数据解码
   */
  streaming = true;
  decoderNthImage: (
    sourceId: string,
    frameIndex: number
  ) => Promise<DecoderImageData>;

  /**
   *
   * @param url worker连接
   * @param sourceId 唯一资源标识
   */
  constructor(
    worker: Worker,
    sources: AvifPlayerSourceType[],
    streaming?: boolean
  ) {
    super(worker);
    this.streaming = streaming;
    this.sources = sources.map(({ sourceId }) => ({
      sourceId,
      decoderImageComplete: false,
      decoderParseComplete: false,
      imageCount: 0,
      width: 0,
      height: 0,
    }));
    this.decoderNthImage = this.streaming
      ? this.decoderStreamingNthImage
      : this.decoderResultNthImage;
    this.onmessage(WorkerAvifDecoderMessageChannel.initial, () => {
      this.decoderInitial = true;
    });
    this.onmessage(
      WorkerAvifDecoderMessageChannel.decodingComplete,
      ({ sourceId }) => {
        this.findSource(sourceId).decoderImageComplete = true;
      }
    );
    this.onmessage(WorkerAvifDecoderMessageChannel.error, (error) => {
      this.emit(DecoderChannel.error, error);
    });
    this.onmessage(
      WorkerAvifDecoderMessageChannel.avifDecoderConsole,
      (data) => {
        console.log(data);
      }
    );
  }

  /**
   * 解析&解码操作
   * @param arrayBuffer
   * @returns
   */
  async decoderParse(sourceId: string, arrayBuffer?: ArrayBuffer) {
    const source = this.findSource(sourceId);
    if (!source.decoderParseComplete) {
      await this.avifDecoderParse(sourceId, arrayBuffer);
      return true;
    } else {
      return true;
    }
  }

  /**
   * 解码指定帧数据
   *
   * 数据流模式
   * @param frameIndex
   * @returns
   */
  decoderStreamingNthImage(sourceId: string, frameIndex: number) {
    // console.log("---frameIndex---", frameIndex);

    return new Promise<DecoderImageData>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage>(
          WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage,
          {
            sourceId,
            frameIndex,
          },
          undefined,
          (data, arrayBuffer) => {
            // console.log("---frameIndex RES---", frameIndex);
            const decoderImageData: DecoderImageData = {
              ...data,
              pixels: arrayBuffer!,
            };
            this.emit(DecoderChannel.nextImage, decoderImageData);
            resolve(decoderImageData);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 解码指定帧数据
   * @param frameIndex
   * @returns
   */
  decoderResultNthImage(sourceId: string, frameIndex: number) {
    return new Promise<DecoderImageData>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifDecoderNthImage>(
          WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
          {
            sourceId,
            frameIndex,
          },
          undefined,
          (data, arrayBuffer) => {
            const decoderImageData: DecoderImageData = {
              ...data,
              pixels: arrayBuffer!,
            };
            this.emit(DecoderChannel.nextImage, decoderImageData);
            resolve(decoderImageData);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 发送图像数据到Worker进行解码
   * @param arrayBuffer
   */
  avifDecoderParse(sourceId: string, arrayBuffer?: ArrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        const source = this.findSource(sourceId);
        if (this.streaming) {
          this.postMessage<WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse>(
            WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse,
            {
              sourceId,
            },
            undefined,
            ({ imageCount, width, height, sourceId }) => {
              source.imageCount = imageCount;
              source.width = width;
              source.height = height;
              this.width = width;
              this.height = height;
              source.decoderParseComplete = true;
              this.emit(DecoderChannel.avifParse, {
                imageCount,
                width,
                height,
                sourceId,
              });
              resolve(source.decoderImageComplete);
            }
          );
        } else {
          this.onmessageOnce(
            WorkerAvifDecoderMessageChannel.avifDecoderParseComplete,
            ({ imageCount, width, height, sourceId }) => {
              source.imageCount = imageCount;
              source.width = width;
              source.height = height;
              source.decoderParseComplete = true;
              this.emit(DecoderChannel.avifParse, {
                imageCount,
                width,
                height,
                sourceId,
              });
              resolve(source.decoderImageComplete);
            }
          );
          this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
            reject(error);
          });
          if (this.streaming) {
            this.postMessage(
              WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse,
              {
                sourceId,
              },
              null,
              (data) => {
                data;
              }
            );
          } else {
            this.postMessage(
              WorkerAvifDecoderMessageChannel.avifDecoderParse,
              {
                sourceId,
              },
              arrayBuffer
            );
          }
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  avifDecoderAllImage(sourceId: string) {
    this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderImage, {
      sourceId,
    });
    this.onmessageOnce(
      WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
      (data) => {
        console.log(data.frameIndex);
      }
    );
  }

  clearNthImageCallback() {
    this.clearCallback(
      WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage
    );
    this.clearCallback(WorkerAvifDecoderMessageChannel.avifDecoderNthImage);
  }

  /**
   * 销毁解码器
   */
  destroy() {
    this.clearAll();
    this.clearOnmessageAll();
    this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderDestroy, {});
    this.worker = null;
    this.emit(DecoderChannel.destroy, {});
  }

  streamingArrayBuffer(
    sourceId: string,
    done: boolean,
    arrayBuffer: Uint8Array,
    size: number
  ) {
    return new Promise<number>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer>(
          WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer,
          {
            sourceId,
            size,
            done,
          },
          arrayBuffer?.buffer,
          (data) => {
            resolve(data.byteLength);
          }
        );
      } catch (error) {
        reject(error);
      }
    });
  }
}
