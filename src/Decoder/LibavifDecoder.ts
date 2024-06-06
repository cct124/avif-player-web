import {
  WorkerAvifDecoderMessageChannel,
  WorkerAvifDecoderEventMap,
  DecoderEventMap,
  DecoderImageData,
  DecoderChannel,
  AvifDecoderNextImageData,
} from "../types/WorkerMessageType";
import { MainEventEmitter } from "./index";

export class LibavifDecoder extends MainEventEmitter<
  WorkerAvifDecoderEventMap,
  DecoderEventMap
> {
  /**
   * 唯一资源标识
   */
  id: string;
  /**
   *
   * @param url worker连接
   * @param id 唯一资源标识
   */
  constructor(worker: Worker, id: string) {
    super(worker);
    this.id = id;
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
  async decoderParse(arrayBuffer: ArrayBuffer) {
    if (!this.decoderParseComplete) {
      await this.avifDecoderParse(arrayBuffer);
      return true;
    } else {
      return true;
    }
  }

  /**
   * 解码指定帧数据
   * @param frameIndex
   * @returns
   */
  decoderNthImage(frameIndex: number) {
    return new Promise<DecoderImageData>((resolve, reject) => {
      try {
        this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderNthImage, {
          id: this.id,
          frameIndex,
        });
        this.onmessageOnce(
          WorkerAvifDecoderMessageChannel.avifDecoderNthImageResult,
          (data, arrayBuffer) => {
            if (data.index === frameIndex) {
              const decoderImageData: DecoderImageData = {
                ...data,
                pixels: arrayBuffer!,
              };
              resolve(decoderImageData);
            }
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
  avifDecoderParse(arrayBuffer: ArrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        this.onmessageOnce(
          WorkerAvifDecoderMessageChannel.avifDecoderParseComplete,
          ({ imageCount, width, height }) => {
            this.imageCount = imageCount;
            this.width = width;
            this.height = height;
            this.decoderParseComplete = true;
            this.emit(DecoderChannel.avifParse, { imageCount, width, height });
            resolve(this.decoderImageComplete);
          }
        );
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
          reject(error);
        });
        this.postMessage(
          WorkerAvifDecoderMessageChannel.avifDecoderParse,
          {
            id: this.id,
          },
          arrayBuffer
        );
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
        console.log(data.index);
      }
    );
  }

  /**
   * 销毁解码器
   */
  destroy() {
    this.emit(DecoderChannel.destroy, {});
    this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderDestroy, {});
    this.worker = null;
  }
}
