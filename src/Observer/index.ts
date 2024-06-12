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
    const _handle = (ev: M[T], arrayBuffer?: ArrayBuffer) => {
      this.clear(channel, _handle);
      handler.call(this, ev, arrayBuffer);
    };

    this.on(channel, _handle);
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
