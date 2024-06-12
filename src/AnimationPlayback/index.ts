import AvifPlayerWeb from "../AvifPlayer";
import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { AvifPlayerWebChannel } from "../types";
import {
  DecoderImageData,
  DecoderChannel,
  DecoderEventMap,
} from "../types/WorkerMessageType";
import { deepMixins, isNumeric, sleep, timeout } from "../utils";
import { PlayChannelType, PlayEventMap, PlayOptions } from "./type";

export default class AnimationPlayback<
  D extends Decoder<DecoderEventMap>,
> extends Observer<PlayEventMap> {
  playing = false;
  paused = false;
  option: PlayOptions;
  decoder: D;
  canvas: HTMLCanvasElement;
  ctx2d?: CanvasRenderingContext2D;
  gl?: WebGLRenderingContext;
  /**
   * 当前帧索引
   */
  index = 0;
  lastTimestamp = 0;
  renderStats: number[] = [];
  loopCount = 0;
  AvifPlayerWeb: AvifPlayerWeb;
  framesCancel: number[] = [];
  pauseIndex: number = 0;
  pts = 0;
  frameIndex = 0;
  framesPerformanceDelay: number[];
  update: (diff: number) => void;
  /**
   * 当前调用栈缓冲大小
   */
  arrayBuffStackSize = 0;
  /**
   * 缓冲区数组长度，这个值是根据 `option.arrayBuffSize`配置的缓冲区大小计算的，不小于1
   */
  arrayBuffLength = 1;

  render!: (
    arrayBuffer: Uint8ClampedArray,
    width: number,
    height: number
  ) => void;
  constructor(
    AvifPlayerWeb: AvifPlayerWeb,
    canvas: HTMLCanvasElement,
    decoder: D,
    option: PlayOptions = {}
  ) {
    super();
    this.AvifPlayerWeb = AvifPlayerWeb;
    this.option = deepMixins(option, {
      webgl: true,
      loop: 1,
      async: false,
      arrayBuffSize: 67108864,
    });
    this.update = this.option.async ? this.updateAsync : this.updateSync;
    if (this.option.loop === 0) this.option.loop = Infinity;
    this.canvas = canvas;
    this.setDecoder(decoder);
    this.on(PlayChannelType.frameIndexChange, (data) => {
      this.AvifPlayerWeb.emit(AvifPlayerWebChannel.frameIndexChange, data);
    });
  }

  setDecoder(decoder: D) {
    this.decoder = decoder;
    if (this.option.async) {
      this.decoder.once(DecoderChannel.nextImage, (data) => {
        this.arrayBuffLength =
          Math.floor(this.option.arrayBuffSize / data.pixels.byteLength) || 1;
      });
    }
  }

  initRender() {
    if (this.option.webgl) {
      this.gl = this.canvas.getContext("webgl")!;
      if (this.gl) {
        this.webglInit(this.gl);
        this.render = this.renderWebgl;
      } else {
        throw new Error("webgl对象创建失败" + this.gl);
      }
    } else {
      this.ctx2d = this.canvas.getContext("2d")!;
      this.render = this.renderCanvas;
    }
  }

  play(index?: number) {
    if (!this.playing) {
      if (this.decoder) {
        if (isNumeric(index)) this.index = index;
        if (this.option.async) {
          this.resetFramesStatus(this.decoder.imageCount);
          if (this.paused) this.index = this.frameIndex + 1;
        }
        this.update(this.paused ? this.pts : 0);
      } else {
        throw new Error("未设置解码器对象");
      }
    }
  }

  resetFramesStatus(imageCount: number) {
    this.framesPerformanceDelay = new Array(imageCount).fill(0);
  }

  /**
   * 暂停播放
   */
  pause(index?: number) {
    if (!this.playing) return;
    this.paused = true;
    if (isNumeric(index)) this.index = index;
    this.framesCancel.forEach((handle) => {
      window.cancelAnimationFrame(handle);
    });
    this.decoder.clearNthImageMessage();
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.pause, true);
    this.playing = false;
    if (this.option.async) {
      this.resetFramesStatus(this.decoder.imageCount);
      this.arrayBuffStackSize = 0;
      console.log(this.arrayBuffStackSize);
    }
  }

  async updateAsync(diff = 0) {
    this.paused = false;
    this.playing = true;
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.play, true);
    let startTime = (this.lastTimestamp = performance.now() - diff);

    for (; this.loopCount < this.option.loop!; this.loopCount++) {
      while (this.index < this.decoder.imageCount && !this.paused) {
        const imageData = await this.decoderNthImageArrayBuff(this.index);
        const now = performance.now();

        startTime = this.framesPerformanceDelay[
          this.framesPerformanceDelay.length - 1
        ]
          ? this.framesPerformanceDelay[this.framesPerformanceDelay.length - 1]
          : startTime;

        const frameDisplayTime = startTime + imageData.pts * 1000;
        let delay = frameDisplayTime - now;
        if (delay < 0) delay = 0;

        const prevDelay = imageData.frameIndex
          ? this.framesPerformanceDelay[imageData.frameIndex - 1]
          : this.framesPerformanceDelay[
              this.framesPerformanceDelay.length - 1
            ] || 0;
        this.framesPerformanceDelay[imageData.frameIndex] = now + delay;

        if (prevDelay > this.framesPerformanceDelay[imageData.frameIndex]) {
          delay = prevDelay - now + 1;
          this.framesPerformanceDelay[imageData.frameIndex] = now + delay;
        }

        this.sleep(delay).then(() => {
          this.arrayBuffStackSize--;
          const pixels = new Uint8ClampedArray(imageData.pixels);
          this.render(pixels, imageData.width, imageData.height);
          this.frameIndex = imageData.frameIndex;
          this.pts = imageData.pts * 1000;
          this.emit(PlayChannelType.frameIndexChange, {
            index: imageData.frameIndex,
            decodeTime: imageData.decodeTime,
          });
        });

        this.lastTimestamp = performance.now();
        this.index++;
      }

      this.index = 0;
    }
    this.index = 0;
    this.loopCount = 0;
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.end, true);
    this.playing = false;
  }

  async updateSync() {
    this.paused = false;
    this.playing = true;
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.play, true);
    this.lastTimestamp = performance.now();
    for (; this.loopCount < this.option.loop!; this.loopCount++) {
      while (this.index < this.decoder.imageCount) {
        const imageData = await this.decoder.decoderNthImage(this.index);
        const delay = this.index
          ? imageData.duration * 1000 - imageData.decodeTime
          : 0;
        if (delay > 0) {
          await this.sleep(delay);
        }
        const pixels = new Uint8ClampedArray(imageData.pixels);
        this.render(pixels, imageData.width, imageData.height);
        this.emit(PlayChannelType.frameIndexChange, {
          index: this.index,
          decodeTime: imageData.decodeTime,
        });
        this.index++;
      }
      this.index = 0;
    }
    this.index = 0;
    this.loopCount = 0;
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.end, true);
    this.playing = false;
  }

  async decoderNthImageArrayBuff(index: number) {
    if (this.arrayBuffStackSize <= this.arrayBuffLength) {
      const imageData = await this.decoder.decoderNthImage(index);
      this.arrayBuffStackSize++;
      return imageData;
    }
    await this.updateArrayBuff();
    const imageData = await this.decoder.decoderNthImage(index);
    this.arrayBuffStackSize++;
    return imageData;
  }

  async updateArrayBuff() {
    return new Promise<boolean>((resolve, reject) => {
      const update = () => {
        if (this.arrayBuffStackSize <= this.arrayBuffLength) {
          resolve(true);
        } else {
          this.requestAnimationFrame(update);
        }
      };
      this.requestAnimationFrame(update);
    });
  }

  awaitNextFrameDecode(decoder: D) {
    return new Promise((resolve, reject) => {
      decoder.once(DecoderChannel.nextImage, () => resolve(true));
      decoder.once(DecoderChannel.error, () => reject(false));
    });
  }

  webglInit(gl: WebGLRenderingContext) {
    // 创建并配置纹理
    const texture = gl.createTexture();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // 顶点着色器
    const vertexShader = gl.createShader(gl.VERTEX_SHADER)!;

    gl.shaderSource(
      vertexShader,
      `
        attribute vec4 position;
        varying vec2 vUV;
        void main() {
          vUV = position.xy * 0.5 + 0.5;
          // 修改此处，翻转Y坐标
          gl_Position = vec4(position.x, -position.y, position.z, position.w);
        }
      `
    );
    gl.compileShader(vertexShader);

    // 片元着色器
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER)!;

    gl.shaderSource(
      fragmentShader,
      `
        precision mediump float;
        varying vec2 vUV;
        uniform sampler2D texture;
        void main() {
          vec4 texColor = texture2D(texture, vUV);
          gl_FragColor = texture2D(texture, vUV);
        }
      `
    );
    gl.compileShader(fragmentShader);

    // 创建着色器程序
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);

    // 创建缓冲区
    const vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, 1.0, -1.0, -1.0, 1.0, 1.0, 1.0]),
      gl.STATIC_DRAW
    );

    // 链接顶点属性
    const positionLocation = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  }

  renderWebgl(
    uint8ClampedArray: Uint8ClampedArray,
    width: number,
    height: number
  ) {
    this.gl!.texImage2D(
      this.gl!.TEXTURE_2D,
      0,
      this.gl!.RGBA,
      width,
      height,
      0,
      this.gl!.RGBA,
      this.gl!.UNSIGNED_BYTE,
      uint8ClampedArray
    );

    // 绘制
    this.gl!.drawArrays(this.gl!.TRIANGLE_STRIP, 0, 4);
  }

  renderCanvas(
    uint8ClampedArray: Uint8ClampedArray,
    width: number,
    height: number
  ) {
    this.ctx2d!.clearRect(0, 0, width, height);
    // 使用转换后的 clampedPixels 创建 ImageData 对象
    const imageData = new ImageData(uint8ClampedArray, width, height);
    // 将 ImageData 对象绘制到 Canvas 上
    this.ctx2d!.putImageData(imageData, 0, 0);
  }

  async sleep(delay: number) {
    if (delay <= 0) {
      return Promise.resolve(0);
    } else {
      return new Promise<number>((resolve) => {
        this.timeout(resolve, delay);
      });
    }
  }

  timeout(callback: (time: number) => void, ms = 0) {
    let start: number;
    const step = (timestamp: number) => {
      if (start === undefined) start = timestamp;
      const elapsed = timestamp - start;
      if (elapsed >= ms) {
        callback(elapsed);
      } else {
        this.requestAnimationFrame(step);
      }
    };
    this.requestAnimationFrame(step);
  }

  destroy() {
    this.pause();
    this.index = 0;
    this.frameIndex = 0;
  }

  requestAnimationFrame(callback: FrameRequestCallback) {
    this.framesCancel.push(window.requestAnimationFrame(callback));
  }
}
