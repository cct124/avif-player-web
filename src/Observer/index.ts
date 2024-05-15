import { MessageEventType } from "../types";

export class MainEventEmitter<M> {
  private eventListeners = new Map<keyof M, Set<(data: any) => void>>();
  worker: Worker;

  constructor(url: string) {
    this.worker = new Worker(url);
    this.worker.onmessage = (...args) => {
      this.listen(...args);
    };
  }

  send<T extends keyof M>(channel: T, data: M[T]) {
    this.worker.postMessage({ channel: channel, data });
  }

  on<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      listeners.add(handler);
    } else {
      this.eventListeners.set(channel, new Set([handler]));
    }
  }

  private listen<T extends keyof M>(
    ev: MessageEvent<MessageEventType<T, M[T]>>
  ) {
    const { channel, data } = ev.data;
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      for (const listener of listeners) {
        listener(data);
      }
    }
  }
}

export class WorkerEventEmitter<M> {
  private eventListeners = new Map<keyof M, Set<(data: any) => void>>();

  constructor() {
    onmessage = this.listen;
  }

  send<T extends keyof M>(channel: T, data: M[T]) {
    postMessage({ channel, data });
  }

  on<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      listeners.add(handler);
    } else {
      this.eventListeners.set(channel, new Set([handler]));
    }
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

export class Observer<M> {
  private eventListeners = new Map<keyof M, Set<(data: any) => void>>();
  constructor() {}

  on<T extends keyof M>(channel: T, handler: (data: M[T]) => void) {
    if (this.eventListeners.has(channel)) {
      const listeners = this.eventListeners.get(channel)!;
      listeners.add(handler);
    } else {
      this.eventListeners.set(channel, new Set([handler]));
    }
    return this;
  }

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
}
