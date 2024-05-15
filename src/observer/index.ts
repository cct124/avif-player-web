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

export class WorkerEventEmitter<E extends { [key: number]: E[keyof E] }> {
  private eventListeners = new Map<keyof E, Set<(data: E[keyof E]) => void>>();

  constructor() {
    onmessage = this.listen;
  }

  send(channel: keyof E, data: E[keyof E]) {
    postMessage({ channel, data });
  }

  on(channel: keyof E, handler: (data: E[keyof E]) => void) {
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
