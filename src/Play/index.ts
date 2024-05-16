import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import {
  DecoderImageData,
  WorkerAvifDecoderMessageChannel,
  DecoderChannel,
  DecoderEventMap,
} from "../types/WorkerMessageType";
import { timeout } from "../utils";
import { PlayChannelType } from "./type";

export default class Play<
  D extends Decoder<DecoderEventMap>
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
      this.index = 0;
      this.update(this.decoder);
    } else {
      throw new Error("未设置解码器对象");
    }
  }

  async update(decoder: D) {
    this.lastTimestamp = performance.now();
    while (this.index < decoder.imageCount) {
      const imageData = decoder.frames[this.index];
      if (imageData === 0) {
        await this.awaitNextFrameDecode(decoder);
      } else {
        const t2 = performance.now();
        const decodeTime = t2 - this.lastTimestamp;
        const imageData = decoder.frames[this.index] as DecoderImageData;
        const delay = this.index ? imageData.duration * 1000 - decodeTime : 0;
        this.index++;
        console.log(decodeTime, imageData.duration * 1000, delay);
        if (delay > 0) {
          await this.sleep(delay);
        }
        this.renderCanvas(imageData.pixels, imageData.width, imageData.height);
        this.lastTimestamp = performance.now();
      }
    }
  }

  awaitNextFrameDecode(decoder: D) {
    return new Promise((resolve, reject) => {
      decoder.once(DecoderChannel.nextImage, () => resolve(true));
      decoder.once(DecoderChannel.error, () => reject(false));
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

  async sleep(delay: number) {
    return new Promise<number>((resolve) => {
      let targetTime = performance.now() + delay;
      function checkTime() {
        if (performance.now() >= targetTime) {
          resolve(delay);
        } else {
          requestAnimationFrame(checkTime);
        }
      }
      requestAnimationFrame(checkTime);
    });
  }
}
