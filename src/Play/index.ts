import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { PlayOptions } from "../types/PlayType";
import {
  DecoderImageData,
  DecoderChannel,
  DecoderEventMap,
} from "../types/WorkerMessageType";
import { deepMixins, timeout } from "../utils";
import { PlayChannelType } from "./type";

export default class Play<
  D extends Decoder<DecoderEventMap>
> extends Observer<PlayChannelType> {
  option: PlayOptions;
  decoder?: D;
  canvas: HTMLCanvasElement;
  ctx2d?: CanvasRenderingContext2D;
  gl?: WebGLRenderingContext;
  /**
   * 当前帧索引
   */
  index = 0;
  lastTimestamp = 0;
  render: (arrayBuffer: ArrayBuffer, width: number, height: number) => void;
  constructor(canvas: HTMLCanvasElement, option: PlayOptions = {}) {
    super();
    this.option = deepMixins(option, {});
    this.canvas = canvas;
    if (this.option.webgl) {
      this.gl = this.canvas.getContext("webgl")!;
      this.render = this.renderWebgl;
    } else {
      this.ctx2d = this.canvas.getContext("2d")!;
      this.render = this.renderCanvas;
    }
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
        console.log(this.index);
        const t2 = performance.now();
        const decodeTime = t2 - this.lastTimestamp;
        // console.log(decodeTime);
        const imageData = decoder.frames[this.index] as DecoderImageData;
        const delay = this.index ? imageData.duration * 1000 - decodeTime : 0;
        if (delay > 0) {
          await this.sleep(delay);
        }
        this.render(imageData.pixels, imageData.width, imageData.height);
        decoder.frames[this.index] = 0;
        this.index++;
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

  renderWebgl(arrayBuffer: ArrayBuffer, width: number, height: number) {
    // 创建并配置纹理
    const texture = this.gl!.createTexture();
    this.gl!.bindTexture(this.gl!.TEXTURE_2D, texture);
    this.gl!.texParameteri(
      this.gl!.TEXTURE_2D,
      this.gl!.TEXTURE_WRAP_S,
      this.gl!.CLAMP_TO_EDGE
    );
    this.gl!.texParameteri(
      this.gl!.TEXTURE_2D,
      this.gl!.TEXTURE_WRAP_T,
      this.gl!.CLAMP_TO_EDGE
    );
    this.gl!.texParameteri(
      this.gl!.TEXTURE_2D,
      this.gl!.TEXTURE_MIN_FILTER,
      this.gl!.NEAREST
    );
    this.gl!.texParameteri(
      this.gl!.TEXTURE_2D,
      this.gl!.TEXTURE_MAG_FILTER,
      this.gl!.NEAREST
    );
    this.gl!.texImage2D(
      this.gl!.TEXTURE_2D,
      0,
      this.gl!.RGBA,
      width,
      height,
      0,
      this.gl!.RGBA,
      this.gl!.UNSIGNED_BYTE,
      new Uint8ClampedArray(arrayBuffer)
    );

    // 顶点着色器
    const vertexShader = this.gl!.createShader(this.gl!.VERTEX_SHADER);
    this.gl!.shaderSource(
      vertexShader,
      `
  attribute vec4 position;
  varying vec2 vUV;
  void main() {
    vUV = position.xy * 0.5 + 0.5;
    gl_Position = position;
  }
`
    );
    this.gl!.compileShader(vertexShader);

    // 片元着色器
    const fragmentShader = this.gl!.createShader(this.gl!.FRAGMENT_SHADER);
    this.gl!.shaderSource(
      fragmentShader,
      `
  precision mediump float;
  varying vec2 vUV;
  uniform sampler2D texture;
  void main() {
    gl_FragColor = texture2D(texture, vUV);
  }
`
    );
    this.gl!.compileShader(fragmentShader);

    // 创建着色器程序
    const program = this.gl!.createProgram();
    this.gl!.attachShader(program, vertexShader);
    this.gl!.attachShader(program, fragmentShader);
    this.gl!.linkProgram(program);
    this.gl!.useProgram(program);

    // 创建缓冲区
    const vertexBuffer = this.gl!.createBuffer();
    this.gl!.bindBuffer(this.gl!.ARRAY_BUFFER, vertexBuffer);
    this.gl!.bufferData(
      this.gl!.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]),
      this.gl!.STATIC_DRAW
    );

    // 链接顶点属性
    const positionLocation = this.gl!.getAttribLocation(program, "position");
    this.gl!.enableVertexAttribArray(positionLocation);
    this.gl!.vertexAttribPointer(
      positionLocation,
      2,
      this.gl!.FLOAT,
      false,
      0,
      0
    );

    // 绘制
    this.gl!.drawArrays(this.gl!.TRIANGLE_STRIP, 0, 4);
  }

  renderCanvas(arrayBuffer: ArrayBuffer, width: number, height: number) {
    this.ctx2d!.clearRect(0, 0, width, height);
    const pixels = new Uint8ClampedArray(arrayBuffer);
    // 使用转换后的 clampedPixels 创建 ImageData 对象
    const imageData = new ImageData(pixels, width, height);
    // 将 ImageData 对象绘制到 Canvas 上
    this.ctx2d!.putImageData(imageData, 0, 0);
  }

  async sleep(delay: number) {
    return new Promise<number>((resolve) => {
      timeout(resolve, delay);
    });
  }
}
