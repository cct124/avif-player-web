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
    listener: (this: this, ev: M[T]) => void
  ): this {
    this.on(channel, (ev: M[T]) => {
      this.clear(channel, listener);
      listener.call(this, ev);
    });
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
}

export class WorkerEventEmitter<M> {
  private eventListeners = new Map<
    keyof M,
    Set<(data: any, arrayBuffer?: ArrayBuffer) => void>
  >();

  constructor() {
    onmessage = (...args) => {
      this.listen(...args);
    };
  }

  send<T extends keyof M>(channel: T, data: M[T], arrayBuffer?: ArrayBuffer) {
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

  on<T extends keyof M>(
    channel: T,
    handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void
  ) {
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      listeners.add(handler);
    } else {
      this.eventListeners.set(channel, new Set([handler]));
    }
  }

  /**
   * 为给定事件添加一次性侦听器。
   * @param channel 频道
   * @param listener 事件回调
   * @returns
   */
  once<T extends keyof M>(
    channel: T,
    handler: (data: M[T], arrayBuffer?: ArrayBuffer) => void
  ): this {
    this.on(channel, (ev: M[T]) => {
      this.clear(channel, handler);
      handler.call(this, ev);
    });
    return this;
  }

  clear<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
    const handlers = this.eventListeners.get(channel);
    if (handlers) {
      return handlers.delete(handler);
    }
    return false;
  }

  private listen<T extends keyof M>(
    ev: MessageEvent<MessageEventType<T, M[T]>>
  ) {
    const [channel, data, arrayBuffer] = ev.data;
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      for (const listener of listeners) {
        listener(data, arrayBuffer);
      }
    }
  }
}
