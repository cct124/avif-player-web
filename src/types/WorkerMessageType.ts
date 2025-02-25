import { AID_TYPE, AnimationID } from "./index";

export enum WorkerAvifDecoderMessageChannel {
  error = 0,

  /**
   * worker解码器初始化完成
   */
  initialComplete = 1,
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
   * 解码所有帧数据
   */
  avifDecoderImage = 6,
  /**
   * 解码指定帧数据
   */
  avifDecoderNthImage = 7,
  /**
   * 销毁解码器
   */
  avifDecoderDestroy = 9,
  /**
   * 输出
   */
  avifDecoderConsole = 10,
  /**
   * 文件数据流
   */
  avifStreamingArrayBuffer = 11,
  /**
   * 解析AVIF文件数据流
   */
  avifDecodeStreamingParse = 12,
  avifDecoderStreamingNthImage = 13,
  /**
   * worker解码器初始化
   */
  initialDecode = 14,
}
export enum DecoderChannel {
  /**
   * 和Workers线程建立通信
   */
  WorkerCommunication = -1,
  error = 0,
  /**
   * 帧数据解码完成
   */
  nextImage = 1,
  /**
   * AVIF文件解析完成
   */
  avifParse = 2,
  /**
   * 首帧数据解码完成
   */
  // firstFrameDecode = 3,
  /**
   * 所有图像数据解码完成
   */
  decodeComplete = 4,
  /**
   * 销毁解码器
   */
  destroy = 5,
}

export interface DecoderEventMap {
  [DecoderChannel.error]: Error | ErrorEvent;
  [DecoderChannel.nextImage]: DecoderAvifImageData;
  [DecoderChannel.avifParse]: AvifParseData;
  [DecoderChannel.decodeComplete]: {};
  [DecoderChannel.destroy]: {};
  [DecoderChannel.WorkerCommunication]: {};
}

export interface AvifParseData extends ResourceSymbol {
  /**
   * 图像宽度
   */
  width: number;
  /**
   * 图像高度
   */
  height: number;
  /**
   * 帧数
   */
  imageCount: number;
}

export interface AvifDecoderParseComplete
  extends AvifParseData,
    ResourceSymbol {}

export interface AvifDecoderNextImageData extends ResourceSymbol {
  /**
   * 帧索引
   */
  frameIndex: number;
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

export interface ResourceSymbol {
  /**
   * 唯一资源标识
   */
  id: AID_TYPE;
}

export interface AvifDecoderParseData extends ResourceSymbol {}

export interface AvifDecoderNthImageData extends ResourceSymbol {
  /**
   * 帧索引
   */
  frameIndex: number;
}

export interface StreamingArrayBuffer extends ResourceSymbol {
  /**
   * 内容大小
   */
  size: number;
  /**
   * 内容是否完全返回
   */
  done: boolean;
}

export interface StreamingArrayBufferCallBack {
  byteLength: number;
}

export interface DecodingComplete extends ResourceSymbol {}

export interface AvifDecodeStreamingParse extends ResourceSymbol {}

export interface Initial {
  decoderStr?: string;
}

export interface WorkerAvifDecoderEventMap {
  [WorkerAvifDecoderMessageChannel.initialDecode]: Initial;
  [WorkerAvifDecoderMessageChannel.avifDecoderParse]: AvifDecoderParseData;
  [WorkerAvifDecoderMessageChannel.avifDecoderNextImage]: AvifDecoderNextImageData;
  [WorkerAvifDecoderMessageChannel.initialComplete]: {};
  [WorkerAvifDecoderMessageChannel.decodingComplete]: DecodingComplete;
  [WorkerAvifDecoderMessageChannel.error]: Error;
  [WorkerAvifDecoderMessageChannel.avifDecoderImage]: ResourceSymbol;
  [WorkerAvifDecoderMessageChannel.avifDecoderNthImage]: AvifDecoderNthImageData;
  [WorkerAvifDecoderMessageChannel.avifDecoderDestroy]: {};
  [WorkerAvifDecoderMessageChannel.avifDecoderConsole]: {};
  [WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer]: StreamingArrayBuffer;
  [WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse]: AvifDecodeStreamingParse;
  [WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage]: AvifDecoderNthImageData;
}

export interface WorkerAvifDecoderCallBackEventMap {
  [WorkerAvifDecoderMessageChannel.avifDecoderParse]: AvifDecoderParseComplete;
  [WorkerAvifDecoderMessageChannel.avifStreamingArrayBuffer]: StreamingArrayBufferCallBack;
  [WorkerAvifDecoderMessageChannel.avifDecoderNthImage]: AvifDecoderNextImageData;
  [WorkerAvifDecoderMessageChannel.avifDecodeStreamingParse]: AvifDecoderParseComplete;
  [WorkerAvifDecoderMessageChannel.avifDecoderStreamingNthImage]: AvifDecoderNextImageData;
}

export enum AvifDecoderMessageChannel {
  streamingArrayBuffer = 1,
  streamingArrayBufferComplete = 2,
  avifDecoderParseComplete = 3,
}

export interface AvifDecoderEventMap {
  [AvifDecoderMessageChannel.streamingArrayBuffer]: StreamingArrayBufferCallBack;
  [AvifDecoderMessageChannel.streamingArrayBufferComplete]: {};
  [AvifDecoderMessageChannel.avifDecoderParseComplete]: AvifDecoderParseComplete;
}
