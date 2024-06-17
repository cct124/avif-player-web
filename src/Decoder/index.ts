import { Observer } from "../Observer";
import { MessageEventType } from "../types";
import {
  DecoderChannel,
  DecoderEventMap,
  DecoderImageData,
} from "../types/WorkerMessageType";
import { generateQuickUniqueId } from "../utils";

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

  clearNthImageMessage() {}

  streamingArrayBuffer(done: boolean, arrayBuffer: Uint8Array, size: number) {}
}

export class MainEventEmitter<
  W,
  C,
  M extends DecoderEventMap,
> extends Decoder<M> {
  private workerListeners = new Map<
    keyof W | string,
    Set<(data: any, arrayBuffer?: ArrayBuffer) => void>
  >();
  private callbackUniqueIds = new Map<keyof W | string, Set<string>>();
  worker: Worker;

  constructor(worker: Worker) {
    super();
    this.setDecoder(worker);
  }

  /**
   * 发送事件到Worker线程
   * @param channel
   * @param data
   * @param arrayBuffer
   * @param callback 可选的回调函数
   */
  postMessage<A extends keyof C, T extends keyof W = keyof W>(
    channel: T | string,
    data: W[T],
    arrayBuffer?: ArrayBuffer,
    callback?: (data: C[A], arrayBuffer?: ArrayBuffer) => void
  ) {
    const args = [];
    if (data instanceof ArrayBuffer) {
      args.push([channel, data], [data]);
    } else {
      if (arrayBuffer instanceof ArrayBuffer) {
        args.push([channel, data, arrayBuffer], [arrayBuffer]);
      } else {
        args.push([channel, data]);
      }
    }
    if (callback) {
      const callbackUniqueId = generateQuickUniqueId();
      this.onmessageOnce(callbackUniqueId, (data: any, arrayBuffer) => {
        if (this.callbackUniqueIds.has(channel)) {
          this.callbackUniqueIds.get(channel)!.delete(callbackUniqueId);
        }
        callback(data, arrayBuffer);
      });
      if (this.callbackUniqueIds.has(channel)) {
        this.callbackUniqueIds.get(channel)!.add(callbackUniqueId);
      } else {
        this.callbackUniqueIds.set(channel, new Set([callbackUniqueId]));
      }
      args[0].push(callbackUniqueId);
    }
    this.worker.postMessage(args[0], args[1] as any);
  }

  /**
   * 为给定的Worker线程事件添加一次性侦听器。
   * @param channel 频道
   * @param handler 事件回调
   * @returns
   */
  onmessageOnce<T extends keyof W>(
    channel: T | string,
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
  clearOnmessage<T extends keyof W>(
    channel: T | string,
    handler: (data: W[T]) => void
  ) {
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
    channel: T | string,
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

  setDecoder(worker: Worker) {
    this.worker = worker;
    worker.postMessage([1, 1]);

    this.worker.onmessage = <T extends keyof W>(
      ev: MessageEvent<MessageEventType<T, W[T]>>
    ) => {
      if ((ev as any).data === 2) {
        return this.emit(DecoderChannel.WorkerCommunication, {});
      }
      this.listenOnmessage(ev);
    };
  }

  clearOnmessageAll<T extends keyof W>(channel?: T) {
    if (channel) {
      this.workerListeners.delete(channel);
    } else {
      this.workerListeners.clear();
    }
  }
}
