import { MainEventEmitter, Observer } from "../Observer";
import { MessageEventType } from "../types";
import {
  DecoderImageData,
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderMessageChannel,
  DecoderEventMap,
} from "../types/WorkerMessageType";

export class Decoder<M> extends Observer<M> {
  constructor() {
    super();
  }
}

export class WorkerObserver<W, M> extends Decoder<M> {
  private workerListeners = new Map<keyof W, Set<(data: any) => void>>();
  worker: Worker;

  constructor(url: string) {
    super();
    this.worker = new Worker(url);
    this.worker.onmessage = (...args) => {
      this.listenOnmessage(...args);
    };
  }

  /**
   * 发送事件到Worker线程
   * @param channel
   * @param data
   * @param args
   */
  postMessage<T extends keyof W>(channel: T, data: W[T], ...args: any[]) {
    this.worker.postMessage({ channel, data }, ...args);
  }

  /**
   * 为给定的Worker线程事件添加一次性侦听器。
   * @param channel 频道
   * @param handler 事件回调
   * @returns
   */
  onmessageOnce<T extends keyof W>(
    channel: T,
    handler: (this: this, ev: W[T]) => void
  ): this {
    this.onmessage(channel, (ev: W[T]) => {
      this.clearOnmessage(channel, handler);
      handler.call(this, ev);
    });
    return this;
  }

  /**
   * 清除Worker线程事件
   * @param channel
   * @param handler
   * @returns
   */
  clearOnmessage<T extends keyof W>(channel: T, handler: (data: W[T]) => void) {
    const handlers = this.workerListeners.get(channel);
    if (handlers) {
      return handlers.delete(handler);
    }
    return false;
  }

  /**
   * 监听Worker线程发送的事件
   * @param channel
   * @param handler
   */
  onmessage<T extends keyof W>(channel: T, handler: (data: W[T]) => void) {
    if (this.workerListeners.has(channel)) {
      const listeners = this.workerListeners.get(channel)!;
      listeners.add(handler);
    } else {
      this.workerListeners.set(channel, new Set([handler]));
    }
  }

  private listenOnmessage<T extends keyof W>(
    ev: MessageEvent<MessageEventType<T, W[T]>>
  ) {
    const { channel, data } = ev.data;
    if (this.workerListeners.has(channel)) {
      const listeners = this.workerListeners.get(channel)!;
      for (const listener of listeners) {
        listener(data);
      }
    }
  }
}

export default class LibavifDecoder extends WorkerObserver<
  WorkerAvifDecoderEventMap,
  DecoderEventMap
> {
  /**
   * 所有帧已成功解码完成
   */
  avifDecoderImageComplete = false;
  avifDecoderParseComplete = false;
  decoderInitial = false;
  decoderVersion = "";
  frames: (DecoderImageData | number)[] = [];
  /**
   * 帧数
   */
  imageCount = 0;
  constructor(url: string) {
    super(url);
    this.onmessage(WorkerAvifDecoderMessageChannel.initial, (version) => {
      this.decoderInitial = true;
      this.decoderVersion = version;
    });
    this.onmessage(WorkerAvifDecoderMessageChannel.decodingComplete, () => {
      this.avifDecoderImageComplete = true;
    });
  }

  async decoder(arrayBuffer: ArrayBuffer) {
    await this.avifDecoderParse(arrayBuffer);
    await this.avifDecoderImage();
    return true;
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
            this.avifDecoderParseComplete = true;
            resolve(this.avifDecoderParseComplete);
          }
        );
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.error, (error) => {
          reject(error);
        });
        this.postMessage(WorkerAvifDecoderMessageChannel.avifDecoderParse, arrayBuffer, [
          arrayBuffer,
        ]);
      } catch (error) {
        reject(error);
      }
    });
  }

  avifDecoderImage() {
    return new Promise((resolve, reject) => {
      if (this.avifDecoderParseComplete) {
        const avifDecoderNextImage = (data: DecoderImageData) =>
          this.decoderImageData(data);
        this.onmessage(
          WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
          avifDecoderNextImage
        );
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.avifDecoderNextImage, () =>
          resolve(true)
        );
        this.onmessageOnce(WorkerAvifDecoderMessageChannel.decodingComplete, () => {
          this.clearOnmessage(
            WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
            avifDecoderNextImage
          );
        });
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
