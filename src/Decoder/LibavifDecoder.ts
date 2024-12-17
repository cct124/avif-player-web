import { AID_TYPE, AvifPlayerSourceType } from "../types";
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
    id: AID_TYPE,
    frameIndex: number
  ) => Promise<DecoderImageData>;

  /**
   *
   * @param url worker连接
   * @param sources 资源对象
   * @param streaming 是否启用数据流解码
   * @param decoderStr 解码器执行代码
   */
  constructor(
    worker: Worker,
    sources: AvifPlayerSourceType[],
    streaming?: boolean,
    decoderStr?: string
  ) {
    super(worker);
    this.streaming = streaming;
    this.sources = sources.map(({ id }) => ({
      id,
      decoderImageComplete: false,
      decoderParseComplete: false,
      imageCount: 0,
      width: 0,
      height: 0,
    }));
    this.decoderNthImage = this.streaming
      ? this.decoderStreamingNthImage
      : this.decoderResultNthImage;
    this.onmessage(WorkerAvifDecoderMessageChannel.initialComplete, () => {
      this.decoderInitial = true;
    });
    this.onmessage(
      WorkerAvifDecoderMessageChannel.decodingComplete,
      ({ id }) => {
        this.findSource(id).decoderImageComplete = true;
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
    this.postMessage(WorkerAvifDecoderMessageChannel.initialDecode, {
      decoderStr,
    });
  }

  /**
   * 解析&解码操作
   * @param arrayBuffer
   * @returns
   */
  async decoderParse(id: AID_TYPE, arrayBuffer?: ArrayBuffer) {
    try {
      await this.avifDecoderParse(id, arrayBuffer);
      return true;
    } catch (error) {
      return Promise.reject(error);
    }
  }

  /**
   * 解码指定帧数据
   *
   * 数据流模式
   * @param frameIndex
   * @returns
   */
  decoderStreamingNthImage(id: AID_TYPE, frameIndex: number) {
    // console.log("---frameIndex---", frameIndex);

    return new Promise<DecoderImageData>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage>(
          WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage,
          {
            id,
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
  decoderResultNthImage(id: AID_TYPE, frameIndex: number) {
    return new Promise<DecoderImageData>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifDecoderNthImage>(
          WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
          {
            id,
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
  avifDecoderParse(id: AID_TYPE, arrayBuffer?: ArrayBuffer) {
    return new Promise((resolve, reject) => {
      try {
        const source = this.findSource(id);
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
          reject(error);
        });
        if (this.streaming) {
          this.postMessage<WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse>(
            WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse,
            {
              id,
            },
            undefined,
            ({ imageCount, width, height, id }) => {
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
                id,
              });
              resolve(source.decoderImageComplete);
            }
          );
        } else {
          this.postMessage<WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse>(
            WorkerAvifDecoderMessageChannel.avifDecoderParse,
            {
              id,
            },
            arrayBuffer,
            ({ imageCount, width, height, id }) => {
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
                id,
              });
              resolve(source.decoderImageComplete);
            }
          );
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  avifDecoderAllImage(id: AID_TYPE) {
    this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderImage, {
      id,
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
    this.clearCallback();
    this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderDestroy, {});
    this.worker = null;
    this.emit(DecoderChannel.destroy, {});
  }

  streamingArrayBuffer(
    id: AID_TYPE,
    done: boolean,
    arrayBuffer: Uint8Array,
    size: number
  ) {
    return new Promise<number>((resolve, reject) => {
      try {
        this.postMessage<WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer>(
          WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer,
          {
            id,
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
