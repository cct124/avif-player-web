import { MessageEventType } from "../types";

export class Observer<M> {
  private eventListeners = new Map<keyof M, Set<(data: any) => void>>();
  constructor() {}

  /**
   * 监听事件
   * @param channel
   * @param handler
   */
  on<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      listeners.add(handler);
    } else {
      this.eventListeners.set(channel, new Set([handler]));
    }
    return this;
  }

  /**
   * 发送事件
   * @param channel
   * @param data
   */
  emit<T extends keyof M>(channel: T, data: M[T]) {
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      for (const listener of listeners) {
        listener(data);
      }
    }
    return this;
  }

  /**
   * 为给定事件添加一次性监听器。
   * @param channel 频道
   * @param listener 事件回调
   * @returns
   */
  once<T extends keyof M>(
    channel: T,
    handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void
  ): this {
    const _handle = (ev: M[T], arrayBuffer?: ArrayBuffer) => {
      this.clear(channel, _handle);
      handler.call(this, ev, arrayBuffer);
    };
    this.on(channel, _handle);
    return this;
  }

  /**
   * 删除监听的事件
   * @param channel
   * @param handler
   * @returns
   */
  clear<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
    const handlers = this.eventListeners.get(channel);
    if (handlers) {
      return handlers.delete(handler);
    }
    return false;
  }

  clearAll<T extends keyof M>(channel?: T) {
    if (channel) {
      this.eventListeners.delete(channel);
    } else {
      this.eventListeners.clear();
    }
  }
}

export class WorkerEventEmitter<M, C, W> extends Observer<W> {
  private workerEventListeners = new Map<
    keyof M,
    Set<
      (
        data: any,
        arrayBuffer?: ArrayBuffer,
        callback?: <A extends keyof C>(
          data: C[A],
          arrayBuffer?: ArrayBuffer
        ) => void
      ) => void
    >
  >();

  constructor() {
    super();
    onmessage = (...args) => {
      this.listen(...args);
    };
  }

  postMessage<T extends keyof M, A extends keyof C>(
    channel: T | number,
    data: M[T] | C[A],
    arrayBuffer?: ArrayBuffer
  ) {
    if (data instanceof ArrayBuffer) {
      postMessage([channel, data], [data]);
    } else {
      if (arrayBuffer instanceof ArrayBuffer) {
        postMessage([channel, data, arrayBuffer], [arrayBuffer]);
      } else {
        postMessage([channel, data]);
      }
    }
  }

  onmessage<T extends keyof M = keyof M>(
    channel: T,
    handler: (
      data: M[T],
      arrayBuffer?: ArrayBuffer,
      callback?: <A extends keyof C>(
        data: C[A],
        arrayBuffer?: ArrayBuffer
      ) => void
    ) => void
  ) {
    if (this.workerEventListeners.has(channel)) {
      const listeners = this.workerEventListeners.get(channel)!;
      listeners.add(handler);
    } else {
      this.workerEventListeners.set(channel, new Set([handler]));
    }
  }

  /**
   * 为给定事件添加一次性侦听器。
   * @param channel 频道
   * @param listener 事件回调
   * @returns
   */
  onmessageOnce<T extends keyof M>(
    channel: T,
    handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void
  ): this {
    const _handle = (ev: M[T], arrayBuffer?: ArrayBuffer) => {
      this.clearOnmessage(channel, _handle);
      handler.call(this, ev, arrayBuffer);
    };

    this.onmessage(channel, _handle);
    return this;
  }

  clearOnmessage<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
    const handlers = this.workerEventListeners.get(channel);
    if (handlers) {
      return handlers.delete(handler);
    }
    return false;
  }

  private listen<T extends keyof M>(
    ev: MessageEvent<MessageEventType<T, M[T]>>
  ) {
    const [channel, data, arrayBuffer, callbackSymbol] = ev.data;
    const args: any[] = [data];
    if (arrayBuffer instanceof ArrayBuffer) {
      args.push(arrayBuffer, this.callback(callbackSymbol, channel));
    } else {
      args.push(null, this.callback(arrayBuffer, channel));
    }
    if (this.workerEventListeners.has(channel)) {
      const listeners = this.workerEventListeners.get(channel)!;
      for (const listener of listeners) {
        listener(args[0], args[1], args[2]);
      }
    }
  }

  callback<A extends keyof C>(
    callbackSymbol: number,
    channel?: string | number | symbol
  ) {
    if (callbackSymbol) {
      return (data: C[A], arrayBuffer?: ArrayBuffer) => {
        this.postMessage(callbackSymbol, data, arrayBuffer);
      };
    }
  }
}
