export enum PlayChannelType {
  frameIndexChange = 1,
}

export interface PlayEventMap {
  [PlayChannelType.frameIndexChange]: FrameIndexChangeEvent;
}

export interface FrameIndexChangeEvent {
  /**
   * 帧索引
   */
  index: number;
  /**
   * 当前帧解码时间
   */
  decodeTime: number;
}

export interface PlayOptions {
  /**
   * 启用webgl渲染
   */
  webgl?: boolean;
  /**
   * 循环播放次数，0表示无限循环播放，默认1
   */
  loop?: number;
  /**
   * 是否开启异步解码，开启这个播放系统将尽可能的解码每一帧，播放将会更流畅，副作用是占用内存大，暂停后重新播放时可能有延迟，默认false
   */
  async?: boolean;
}
