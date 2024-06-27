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
  abstract decoderParse(
    sourceId: string,
    arrayBuffer: ArrayBuffer
  ): Promise<boolean>;
  abstract decoderNthImage(
    sourceId: string,
    frameIndex: number
  ): Promise<DecoderImageData>;
  /**
   * 查找资源对象
   * @param sourceId
   */
  abstract findSource(sourceId: string): SOURCE;
}

export interface SOURCE {
  /**
   * 唯一资源标识
   */
  sourceId: string;
  /**
   * 所有帧已成功解码完成
   */
  decoderImageComplete: boolean;
  /**
   * 文件解析完成
   */
  decoderParseComplete: boolean;
  /**
   * 帧数
   */
  imageCount: number;
  /**
   * 图像宽度
   */
  width: number;
  /**
   * 图像高度
   */
  height: number;
}

export class Decoder<M> extends Observer<M> implements DecoderAbstract {
  /**
   * 解码器初始化完成
   */
  decoderInitial = false;
  /**
   * 解码器版本
   */
  decoderVersion = "";

  sources: SOURCE[] = [];

  constructor() {
    super();
  }

  findSource(sourceId: string) {
    return this.sources.find((source) => source.sourceId === sourceId);
  }

  decoderParse(sourceId: string, arrayBuffer: ArrayBuffer) {
    return Promise.resolve(true);
  }

  decoderNthImage(sourceId: string, frameIndex: number) {
    return Promise.resolve({} as DecoderImageData);
  }

  avifDecoderAllImage(sourceId: string) {}

  /**
   * 删除所有`NthImage`解码回调
   */
  clearNthImageCallback() {}

  streamingArrayBuffer(
    sourceId: string,
    done: boolean,
    arrayBuffer: Uint8Array,
    size: number
  ) {}
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

  clearOnmessageAll<T extends keyof W>(channel?: T | string) {
    if (channel) {
      this.workerListeners.delete(channel);
    } else {
      this.workerListeners.clear();
    }
  }

  clearCallback<T extends keyof W>(channel?: T) {
    if (channel) {
      if (this.callbackUniqueIds.has(channel)) {
        for (const uniqueId of this.callbackUniqueIds.get(channel)) {
          this.clearOnmessageAll(uniqueId);
        }
      }
    } else {
      this.callbackUniqueIds.forEach((uniqueIds) => {
        for (const uniqueId of uniqueIds) {
          this.clearOnmessageAll(uniqueId);
        }
      });
    }
  }
}
