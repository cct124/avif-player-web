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
  constructor(url: string) {
    super(url);
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
  async decoder(arrayBuffer: ArrayBuffer) {
    if (this.frames.length === 0) {
      await this.avifDecoderParse(arrayBuffer);
      this.avifDecoderImage();
      return true;
    } else {
      return true;
    }
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
            this.frames = new Array(this.imageCount).fill(0);
            this.decoderParseComplete = true;
            resolve(this.decoderImageComplete);
          }
        );
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
          reject(error);
        });
        this.postMessage(
          WorkerAvifDecoderMessageChannel.avifDecoderParse,
          arrayBuffer
        );
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 解码所有帧数据
   *
   * 调用此函数前先调用`avifDecoderParse`
   * @returns
   */
  avifDecoderImage() {
    return new Promise((resolve, reject) => {
      if (this.decoderParseComplete) {
        // 缓存解码的图像数据
        const avifDecoderNextImage = (
          data: AvifDecoderNextImageData,
          arrayBuffer?: ArrayBuffer
        ) => {
          console.log(arrayBuffer?.byteLength);

          if (arrayBuffer) {
            const imageData = data as DecoderImageData;
            imageData.pixels = new Uint8ClampedArray(arrayBuffer.slice(2, arrayBuffer.byteLength / 2));
            this.decoderImageData(imageData);
            // 发送解码事件
            this.emit(DecoderChannel.nextImage, imageData);
          } else {
            this.emit(
              DecoderChannel.error,
              new Error("arrayBuffer 对象为空！")
            );
          }
        };

        // 监听Worker线程NextImage解码事件
        this.onmessage(
          WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
          avifDecoderNextImage
        );
        // 成功解码数据返回异步
        this.onmessageOnce(
          WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
          () => resolve(true)
        );
        // 监听所有图片数据解码完成事件
        this.onmessageOnce(
          WorkerAvifDecoderMessageChannel.decodingComplete,
          () => {
            // 清除监听的方法事件
            this.clearOnmessage(
              WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
              avifDecoderNextImage
            );
          }
        );
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
          reject(error);
        });
        this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderImage, {});
      } else {
        reject(new Error("avifDecoderParseComplete 未解析完成"));
      }
    });
  }

  private decoderImageData(data: DecoderImageData) {
    this.frames[data.index] = data;
  }
}
