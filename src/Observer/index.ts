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
export class MainEventEmitter<W, M> extends Observer<M> {
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

export class WorkerEventEmitter<M> {
  private eventListeners = new Map<keyof M, Set<(data: any) => void>>();

  constructor() {
    onmessage = (...args) => {
      this.listen(...args);
    };
  }

  send<T extends keyof M>(channel: T, data: M[T], ...args: any[]) {
    postMessage({ channel, data }, ...args);
  }

  on<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
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
    listener: (this: this, ev: M[T]) => void
  ): this {
    this.on(channel, (ev: M[T]) => {
      this.clear(channel, listener);
      listener.call(this, ev);
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

  private listen(ev: MessageEvent<any>) {
    const { channel, data } = ev.data;
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      for (const listener of listeners) {
        listener(data);
      }
    }
  }
}
