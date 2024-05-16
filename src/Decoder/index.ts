import { Observer } from "../Observer";
import { MessageEventType } from "../types";
import { DecoderImageData } from "../types/WorkerMessageType";

abstract class DecoderAbstract {
  /**
   * 进行解码操作
   * @param arrayBuffer
   */
  abstract decoder(arrayBuffer: ArrayBuffer): Promise<boolean>;
}

export class Decoder<M> extends Observer<M> implements DecoderAbstract {
  /**
   * 所有帧已成功解码完成
   */
  decoderImageComplete = false;
  /**
   * 文件解析完成
   */
  decoderParseComplete = false;
  /**
   * 解码器初始化完成
   */
  decoderInitial = false;
  /**
   * 解码器版本
   */
  decoderVersion = "";
  /**
   * 解码的帧数据集合
   */
  frames: (DecoderImageData | number)[] = [];
  /**
   * 帧数
   */
  imageCount = 0;

  constructor() {
    super();
  }

  decoder(arrayBuffer: ArrayBuffer) {
    return Promise.resolve(true);
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
