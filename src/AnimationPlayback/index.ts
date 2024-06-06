import AvifPlayerWeb from "../AvifPlayer";
import { Decoder } from "../Decoder";
import { Observer } from "../Observer";
import { AvifPlayerWebChannel } from "../types";
import { PlayOptions } from "../types/PlayType";
import {
  DecoderImageData,
  DecoderChannel,
  DecoderEventMap,
} from "../types/WorkerMessageType";
import { deepMixins, timeout } from "../utils";
import { PlayChannelType, PlayEventMap } from "./type";

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
  framesStatus: [Promise<any>, (value?: any) => void][] = [];
  framesCancel: number[] = [];
  pauseIndex: number = 0;
  pts = 0;
  frameIndex = 0;

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
    });
    if (this.option.loop === 0) this.option.loop = Infinity;
    this.canvas = canvas;
    this.setDecoder(decoder);
    this.on(PlayChannelType.frameIndexChange, (data) => {
      this.AvifPlayerWeb.emit(AvifPlayerWebChannel.frameIndexChange, data);
    });
  }

  setDecoder(decoder: D) {
    this.decoder = decoder;
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
        if (!isNaN(index)) this.index = index;
        this.resetFramesStatus(this.decoder.imageCount);
        this.update(this.paused ? this.pts : 0);
      } else {
        throw new Error("未设置解码器对象");
      }
    }
  }

  resetFramesStatus(imageCount: number) {
    this.framesStatus = new Array(imageCount + 1).fill(null);
    this.framesCancel = new Array(imageCount).fill(0);
  }

  /**
   * 暂停播放
   */
  pause(index?: number) {
    console.log("-----pause-----");
    this.paused = true;
    if (!isNaN(index)) this.index = index;
    this.framesCancel
      .filter((handle) => handle > 0)
      .forEach((handle) => {
        window.cancelAnimationFrame(handle);
        this.framesStatus = null;
      });
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.pause, true);
    this.playing = false;
    this.resetFramesStatus(this.decoder.imageCount);
    this.index = this.frameIndex;
  }

  async update(diff = 0) {
    this.paused = false;
    this.playing = true;
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.play, true);
    for (
      this.loopCount = this.loopCount;
      this.loopCount < this.option.loop!;
      this.loopCount++
    ) {
      if (this.framesStatus[this.decoder.imageCount])
        await this.framesStatus[this.decoder.imageCount][0];
      this.lastTimestamp = performance.now();
      let startTime = this.lastTimestamp;
      this.framesStatus[this.index] = [Promise.resolve(), () => {}];

      while (this.index < this.decoder.imageCount) {
        if (this.paused) return;

        this.framesStatus[this.index + 1] = [null, null];
        this.framesStatus[this.index + 1][0] = new Promise((resolve) => {
          this.framesStatus[this.index + 1][1] = resolve;
        });

        console.log("decoderNthImage", this.index);
        const imageData = await this.decoder.decoderNthImage(this.index);
        if (this.paused) return;

        const frameDisplayTime = startTime + imageData.pts * 1000 - diff;
        let delay = frameDisplayTime - performance.now() - imageData.decodeTime;

        if (delay < 0) delay = 0;
        const [promise] = this.framesStatus[imageData.index];
        const [, resolve] = this.framesStatus[imageData.index + 1];

        this.sleep(delay, imageData.index).then(() => {
          if (this.paused) return;
          this.framesCancel[imageData.index] = null;
          const pixels = new Uint8ClampedArray(imageData.pixels);
          promise.then(() => {
            console.log("render", imageData.index);

            this.render(pixels, imageData.width, imageData.height);
            this.pts = imageData.pts * 1000;
            this.frameIndex = imageData.index;
            this.emit(PlayChannelType.frameIndexChange, {
              index: this.frameIndex,
              decodeTime: imageData.decodeTime,
            });
            resolve();
            this.framesStatus[imageData.index] = null;
          });
        });

        this.lastTimestamp = performance.now();
        this.index++;
      }

      this.index = 0;
      startTime = performance.now();
    }
    this.index = 0;
    this.loopCount = 0;
    this.AvifPlayerWeb.emit(AvifPlayerWebChannel.end, true);
    this.playing = false;
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
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (vertexShader) {
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
      const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      if (fragmentShader) {
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
        const program = gl.createProgram();
        if (program) {
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
      }
    }
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

  async sleep(delay: number, index: number) {
    if (delay <= 0) {
      return Promise.resolve();
    } else {
      return new Promise<number>((resolve) => {
        this.timeout(resolve, delay, index);
      });
    }
  }

  timeout(callback: (elapsed: number) => void, ms = 0, index: number) {
    let start: number;
    const step = (timestamp: number) => {
      if (start === undefined) start = timestamp;
      const elapsed = timestamp - start;

      if (elapsed >= ms) {
        callback(elapsed);
      } else {
        this.framesCancel[index] = requestAnimationFrame(step);
      }
    };

    const requestAnimationFrame = window.requestAnimationFrame;
    this.framesCancel[index] = requestAnimationFrame(step);
  }
}
