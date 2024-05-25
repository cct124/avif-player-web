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
}

export enum SoftAvifWebMessageType {}

export interface SoftAvifWebEventMap {}
