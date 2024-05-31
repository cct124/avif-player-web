/**
 * 可选配置项
 */

import { FrameIndexChangeEvent } from "../AnimationPlayback/type";
export interface AvifPlayerWebOptions {
  canvas?: string | HTMLCanvasElement;
  /**
   * 启用webgl api渲染
   */
  webgl?: boolean;
  /**
   * 循环播放次数，0表示无限循环播放，默认1
   */
  loop?: number;
  /**
   * 初始化完成后立即播放
   */
  autoplay?: boolean;
}

export enum AvifPlayerWebMessageType {}

export interface AvifPlayerWebEventMap {}

export enum AvifPlayerWebChannel {
  error = "error",
  play = "play",
  pause = "pause",
  end = "end",
  frameIndexChange = "frameIndexChange",
}

export interface AvifPlayerWebEventMap {
  [AvifPlayerWebChannel.error]: Error | ErrorEvent;
  [AvifPlayerWebChannel.play]: boolean;
  [AvifPlayerWebChannel.end]: boolean;
  [AvifPlayerWebChannel.pause]: boolean;
  [AvifPlayerWebChannel.frameIndexChange]: FrameIndexChangeEvent;
}
