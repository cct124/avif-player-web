export interface MessageEventType<T, E> {
  channel: T;
  data: E;
}
