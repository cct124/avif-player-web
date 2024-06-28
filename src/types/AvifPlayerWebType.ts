import { AID_TYPE } from ".";

export interface Loop {
  /**
   * 循环播放次数，0表示无限循环播放，默认1
   */
  loop?: number;
}

export interface Source extends Loop {
  /**
   * 指定唯一的动画id，切换动画时传入此id
   */
  id: number | string;
  /**
   * 资源路径
   */
  url?: string;
  /**
   * 资源数据
   */
  arrayBuffer?: ArrayBuffer;
}

/**
 * 可选配置项
 */
export interface AvifPlayerWebOptions extends Loop {
  source?: Source[];
  /**
   * 传入canvas DOM对象或id
   */
  canvas?: string | HTMLCanvasElement;
  /**
   * 启用webgl api渲染
   */
  webgl?: boolean;
  /**
   * 初始化完成后立即播放
   */
  autoplay?: boolean;
  /**
   * 是否开启异步解码，开启这个播放系统将尽可能的解码每一帧，播放将会更流畅，副作用是占用内存大，暂停后重新播放时可能有延迟，默认false
   */
  async?: boolean;
  /**
   * 开启异步解码时图像数据缓冲区允许最大的内存占用，这个值是根据`pixels.byteLength`图像数据大小计算的，真正占用的内存空间会比这个值略大，默认`67108864`即`64MB`，单位`byte`
   */
  arrayBuffSize?: number;
  /**
   * 实例化对象时立刻初始化解码器，默认false
   */
  initDecoderInstantly?: boolean;
  /**
   * 实例化对象时立刻初始化解码器并开始下载解析AVIF文件，默认false
   */
  initDecoderAvifInstantly?: boolean;
  /**
   * 是否启用边下边播功能，默认开启
   */
  enableStreaming?: boolean;
  /**
   * 播放的动画id，默认是`source`数组第一个动画id
   */
  playingId?: AID_TYPE;
}

export enum AvifPlayerWebMessageType {}

export interface AvifPlayerWebEventMap {}
