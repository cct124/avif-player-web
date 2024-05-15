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
