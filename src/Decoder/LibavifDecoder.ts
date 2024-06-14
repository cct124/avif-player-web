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
   * 唯一资源标识
   */
  id: string;
  /**
   * 启用流数据解码
   */
  streaming = true;
  decoderNthImage: (frameIndex: number) => Promise<DecoderImageData>;

  /**
   *
   * @param url worker连接
   * @param id 唯一资源标识
   */
  constructor(worker: Worker, id: string, streaming?: boolean) {
    super(worker);
    this.streaming = streaming;
    this.id = id;
    this.decoderNthImage = this.streaming
      ? this.decoderStreamingNthImage
      : this.decoderResultNthImage;
    this.onmessage(WorkerAvifDecoderMessageChannel.initial, (version) => {
      this.decoderInitial = true;
      this.decoderVersion = version;
    });
    this.onmessage(WorkerAvifDecoderMessageChannel.decodingComplete, () => {
      this.decoderImageComplete = true;
    });
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
  async decoderParse(arrayBuffer?: ArrayBuffer) {
    if (!this.decoderParseComplete) {
      await this.avifDecoderParse(arrayBuffer);
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
  decoderStreamingNthImage(frameIndex: number) {
    // console.log("---frameIndex---", frameIndex);

    return new Promise<DecoderImageData>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage>(
          WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage,
          {
            id: this.id,
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
  decoderResultNthImage(frameIndex: number) {
    return new Promise<DecoderImageData>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifDecoderNthImage>(
          WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
          {
            id: this.id,
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
  avifDecoderParse(arrayBuffer?: ArrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        if (this.streaming) {
          this.postMessage<WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse>(
            WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse,
            {
              id: this.id,
            },
            undefined,
            ({ imageCount, width, height }) => {
              this.imageCount = imageCount;
              this.width = width;
              this.height = height;
              this.decoderParseComplete = true;
              this.emit(DecoderChannel.avifParse, {
                imageCount,
                width,
                height,
              });
              resolve(this.decoderImageComplete);
            }
          );
        } else {
          this.onmessageOnce(
            WorkerAvifDecoderMessageChannel.avifDecoderParseComplete,
            ({ imageCount, width, height }) => {
              this.imageCount = imageCount;
              this.width = width;
              this.height = height;
              this.decoderParseComplete = true;
              this.emit(DecoderChannel.avifParse, {
                imageCount,
                width,
                height,
              });
              resolve(this.decoderImageComplete);
            }
          );
          this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
            reject(error);
          });
          if (this.streaming) {
            this.postMessage(
              WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse,
              {
                id: this.id,
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
                id: this.id,
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

  avifDecoderAllImage() {
    this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderImage, {
      id: this.id,
    });
    this.onmessageOnce(
      WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
      (data) => {
        console.log(data.frameIndex);
      }
    );
  }

  clearNthImageMessage() {
    this.clearOnmessageAll(
      WorkerAvifDecoderMessageChannel.avifDecoderNthImageResult
    );
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

  streamingArrayBuffer(done: boolean, arrayBuffer: Uint8Array, size: number) {
    return new Promise<number>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer>(
          WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer,
          {
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
