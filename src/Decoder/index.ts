import { Observer } from "../Observer";
import { MessageEventType } from "../types";
import { DecoderImageData } from "../types/WorkerMessageType";

abstract class DecoderAbstract {
  /**
   * 进行解码操作
   * @param arrayBuffer
   */
  abstract decoderParse(arrayBuffer: ArrayBuffer): Promise<boolean>;
  abstract decoderNthImage(frameIndex: number): Promise<DecoderImageData>;
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
   * 帧数
   */
  imageCount = 0;
  /**
   * 图像宽度
   */
  width = 0;
  /**
   * 图像高度
   */
  height = 0;

  constructor() {
    super();
  }

  decoderParse(arrayBuffer: ArrayBuffer) {
    return Promise.resolve(true);
  }

  decoderNthImage(frameIndex: number) {
    return Promise.resolve({} as DecoderImageData);
  }

  avifDecoderAllImage() {}
}

export class MainEventEmitter<W, M> extends Decoder<M> {
  private workerListeners = new Map<
    keyof W,
    Set<(data: any, arrayBuffer?: ArrayBuffer) => void>
  >();
  worker: Worker;

  constructor(url: string) {
    super();
    this.worker = new Worker(url);
    this.worker.onmessage = <T extends keyof W>(
      ev: MessageEvent<MessageEventType<T, W[T]>>
    ) => {
      this.listenOnmessage(ev);
    };
  }

  /**
   * 发送事件到Worker线程
   * @param channel
   * @param data
   * @param args
   */
  postMessage<T extends keyof W>(
    channel: T,
    data: W[T],
    arrayBuffer?: ArrayBuffer
  ) {
    if (data instanceof ArrayBuffer) {
      this.worker.postMessage([channel, data], [data]);
    } else {
      if (arrayBuffer instanceof ArrayBuffer) {
        this.worker.postMessage([channel, data, arrayBuffer], [arrayBuffer]);
      } else {
        this.worker.postMessage([channel, data]);
      }
    }
  }

  /**
   * 为给定的Worker线程事件添加一次性侦听器。
   * @param channel 频道
   * @param handler 事件回调
   * @returns
   */
  onmessageOnce<T extends keyof W>(
    channel: T,
    handler: (this: this, ev: W[T], arrayBuffer?: ArrayBuffer) => void
  ): this {
    const _handle = (ev: W[T], arrayBuffer?: ArrayBuffer) => {
      handler.call(this, ev, arrayBuffer);
      this.clearOnmessage(channel, _handle);
    };
    this.onmessage(channel, _handle);
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
      handlers.delete(handler);
      return;
    }
    return false;
  }

  /**
   * 监听Worker线程发送的事件
   * @param channel
   * @param handler
   */
  onmessage<T extends keyof W>(
    channel: T,
    handler: (data: W[T], arrayBuffer?: ArrayBuffer) => void
  ) {
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
    const [channel, data, arrayBuffer] = ev.data;
    if (this.workerListeners.has(channel)) {
      const listeners = this.workerListeners.get(channel)!;
      for (const listener of listeners) {
        listener(data, arrayBuffer);
      }
    }
  }
}
