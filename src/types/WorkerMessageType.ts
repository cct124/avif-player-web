export enum WorkerAvifDecoderMessageChannel {
  error = 0,
  /**
   * worker解码器初始化完成
   */
  initial = 1,
  /**
   * 提交Uint8Array数据到worker线程解码
   */
  avifDecoderParse = 2,
  /**
   * 每帧解码数据完成
   */
  avifDecoderNextImage = 3,
  /**
   * 所有图像数据解码完成
   */
  decodingComplete = 4,
  /**
   * Avif文件解析完成
   */
  avifDecoderParseComplete = 5,
  /**
   * 解码所有帧数据
   */
  avifDecoderImage = 6,
}

export enum DecoderChannel {
  error = 0,
  nextImage = 1,
}

export interface WorkerAvifDecoderEventMap {
  [WorkerAvifDecoderMessageChannel.avifDecoderParse]: ArrayBuffer;
  [WorkerAvifDecoderMessageChannel.avifDecoderNextImage]: AvifDecoderNextImageData;
  [WorkerAvifDecoderMessageChannel.initial]: string;
  [WorkerAvifDecoderMessageChannel.decodingComplete]: {};
  [WorkerAvifDecoderMessageChannel.avifDecoderParseComplete]: AvifDecoderParseComplete;
  [WorkerAvifDecoderMessageChannel.error]: Error;
  [WorkerAvifDecoderMessageChannel.avifDecoderImage]: {};
}

export interface DecoderEventMap {
  [DecoderChannel.error]: Error | ErrorEvent;
  [DecoderChannel.nextImage]: DecoderAvifImageData;
}

export interface AvifDecoderParseComplete {
  /**
   * 帧数
   */
  imageCount: number;
}

export interface AvifDecoderNextImageData {
  /**
   * 帧索引
   */
  index: number;
  /**
   * 图像宽度
   */
  width: number;
  /**
   * 图像高度
   */
  height: number;
  /**
   * 像素位深度[8, 10, 12, 16]。如果深度大于8，则像素在内部必须是uint16_t类型。
   */
  depth: number;
  /**
   * 媒体的时间刻度（赫兹）
   */
  timescale: number;
  /**
   * 以秒为单位的展示时间戳（ptsInTimescales / timescale）
   */
  pts: number;
  /**
   * 展示时间戳（以"timecales"为单位）
   */
  ptsInTimescales: number;
  /**
   * 以秒为单位的持续时间（durationInTimescales / timescale）
   */
  duration: number;
  /**
   * 持续时间（以"timecales"为单位）
   */
  durationInTimescales: number;
  /**
   * 解码时间
   */
  decodeTime: number;
}

/**
 * 每帧图像数据
 */
export interface DecoderImageData extends AvifDecoderNextImageData {
  /**
   * 像素集合
   */
  pixels: ArrayBuffer;
}

export interface DecoderAvifImageData extends DecoderImageData {}
