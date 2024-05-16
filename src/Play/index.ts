import Decoder from "../Decoder";
import { Observer } from "../Observer";
import {
  DecoderImageData,
  WorkerAvifDecoderMessageChannel,
  DecoderChannel,
} from "../types/WorkerMessageType";
import { timeout } from "../utils";
import { PlayChannelType } from "./type";

export default class Play<
  D extends Observer<DecoderChannel>
> extends Observer<PlayChannelType> {
  decoder?: D;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  /**
   * 当前帧索引
   */
  index = 0;
  lastTimestamp = 0;
  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.context = this.canvas.getContext("2d")!;
  }

  setDecoder(decoder: D) {
    this.decoder = decoder;
  }

  play() {
    if (this.decoder) {
    } else {
      throw new Error("未设置解码器对象");
    }
  }

  async update(decoder: Decoder) {
    while (this.index < decoder.imageCount) {
      let imageData = decoder.frames[this.index];
      if (imageData === 0) {
        await this.awaitNextFrameDecode(decoder);
      } else {
        imageData = decoder.frames[this.index];
        // const delay = this.lastTimestamp
        //   ? imageData.pts * 1000 - this.lastTimestamp
        //   : 0;
      }
    }
  }

  awaitNextFrameDecode(decoder: Decoder) {
    return new Promise((resolve, reject) => {
      decoder.onmessage(WorkerAvifDecoderMessageChannel.avifDecoderNextImage, () =>
        resolve(true)
      );
      decoder.onmessage(WorkerAvifDecoderMessageChannel.error, () => reject(false));
    });
  }

  // async playCacheFrames() {
  //   if (!this.frames?.length || this.imageCount === 0) return;
  //   if (this.index < this.imageCount) return;
  //   const imageData = this.frames[this.index];
  //   if (!imageData || imageData.index !== this.index) return;
  //   const now = performance.now();
  //   const delay = this.lastTimestamp
  //     ? imageData.pts * 1000 - this.lastTimestamp
  //     : 0;
  //   await new Promise((resolve) => setTimeout(resolve, delay));

  //   try {
  //     this.renderCanvas(imageData.pixels, imageData.width, imageData.height);
  //     this.lastTimestamp = delay;
  //     await this.playCacheFrames();
  //   } catch (err) {
  //     throw err;
  //   }
  // }

  // async playDecoderFrame(imageData: DecoderImageData) {
  //   const now = performance.now();
  //   const delay = this.lastTimestamp
  //     ? imageData.pts * 1000 - this.lastTimestamp
  //     : 0;
  //   timeout(() => {
  //     this.lastTimestamp = now + delay;
  //     this.renderCanvas(imageData.pixels, imageData.width, imageData.height);
  //   }, delay);
  // }

  renderCanvas(arrayBuffer: ArrayBuffer, width: number, height: number) {
    const pixels = new Uint8ClampedArray(arrayBuffer);
    // 使用转换后的 clampedPixels 创建 ImageData 对象
    const imageData = new ImageData(pixels, width, height);
    // 将 ImageData 对象绘制到 Canvas 上
    this.context.putImageData(imageData, 0, 0);
  }
}
