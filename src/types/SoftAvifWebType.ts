/**
 * 可选配置项
 */
export interface SoftAvifWebOptions {
  canvas?: string | HTMLCanvasElement;
  /**
   * 实例化完成后立即解码
   */
  decodeImmediately?: boolean;
  /**
   * 启用webgl api渲染
   */
  webgl?: boolean;
  /**
   * 循环播放次数，0表示无限循环播放，默认1
   */
  loop?: number;
}

export enum SoftAvifWebMessageType {}

export interface SoftAvifWebEventMap {}
