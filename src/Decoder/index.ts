import { Observer } from "../Observer";
import { AID_TYPE, MessageEventType } from "../types";
import {
  DecoderChannel,
  DecoderEventMap,
  DecoderImageData,
  ResourceSymbol,
} from "../types/WorkerMessageType";
import { generateQuickUniqueId } from "../utils";

abstract class DecoderAbstract {
  /**
   * 进行解码操作
   * @param arrayBuffer
   */
  abstract decoderParse(
    id: AID_TYPE,
    arrayBuffer: ArrayBuffer
  ): Promise<boolean>;
  abstract decoderNthImage(
    id: AID_TYPE,
    frameIndex: number
  ): Promise<DecoderImageData>;
  /**
   * 查找资源对象
   * @param id
   */
  abstract findSource(id: AID_TYPE): SourceType;
}

export interface SourceType extends ResourceSymbol {
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

  sources: SourceType[] = [];

  /**
   * 图像宽度
   */
  width: number;
  /**
   * 图像高度
   */
  height: number;

  constructor() {
    super();
  }

  findSource(id: AID_TYPE) {
    return this.sources.find((source) => source.id === id);
  }

  decoderParse(id: AID_TYPE, arrayBuffer: ArrayBuffer) {
    return Promise.resolve(true);
  }

  decoderNthImage(id: AID_TYPE, frameIndex: number) {
    return Promise.resolve({} as DecoderImageData);
  }

  avifDecoderAllImage(id: AID_TYPE) {}

  /**
   * 删除所有`NthImage`解码回调
   */
  clearNthImageCallback() {}

  streamingArrayBuffer(
    id: string,
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
    keyof W | string | number,
    Set<(data: any, arrayBuffer?: ArrayBuffer) => void>
  >();
  private callbackUniqueIds = new Map<
    keyof W | string | number,
    Set<string | number>
  >();
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
    channel: T | string | number,
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
    channel: T | string | number,
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
    channel: T | string | number,
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
    channel: T | string | number,
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

  clearOnmessageAll<T extends keyof W>(channel?: T | string | number) {
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
      this.callbackUniqueIds.clear();
    }
  }
}
