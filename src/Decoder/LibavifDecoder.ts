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
  constructor(url: string, id: string) {
    super(url);
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
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
          reject(error);
        });
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
          (data) => {
            this.imageCount = data.imageCount;
            this.decoderParseComplete = true;
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
}
