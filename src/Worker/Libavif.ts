import {
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "../types/WorkerMessageType";
import { WorkerEventEmitter } from "../Observer/index";
import { AVIF_RESULT, AvifImageCache, AvifImageTiming } from "./type";
import LibavifWorker from "./Libavif.worker";

const AVIF_RGB_IMAGE_STRUCT_SIZE = 64;
const AVIF_RGB_IMAGE_TIMING_STRUCT_SIZE = 40;

export default class Libavif {
  AwsmAvifDecode: any;
  decoderPtr?: number;
  bufferPtr?: number;
  width?: number;
  height?: number;
  avifImageCachePtr?: number;
  index = 0;
  imageCount = 0;
  decoderNthImage!: (id: string, frameIndex: number) => void;
  rbgPtr?: number;
  decodeStats: number[] = [];
  libavifWorker: LibavifWorker;

  constructor(libavifWorker: LibavifWorker, awsmAvifDecode: any) {
    this.libavifWorker = libavifWorker;
    this.AwsmAvifDecode = awsmAvifDecode;
  }

  avifDecoderParse(arrayBuffer: ArrayBuffer) {
    try {
      const bufferSize = arrayBuffer.byteLength;
      this.bufferPtr = this.AwsmAvifDecode._malloc(bufferSize);
      if (!this.bufferPtr) {
        throw new Error("Failed to allocate memory for buffer");
      }

      this.AwsmAvifDecode.HEAPU8.set(
        new Uint8Array(arrayBuffer),
        this.bufferPtr
      );

      this.decoderPtr = this.AwsmAvifDecode._avifDecoderCreate();
      if (!this.decoderPtr) {
        this.free(this.bufferPtr);
        throw new Error("Failed to create decoder");
      }

      let result = this.AwsmAvifDecode._avifDecoderSetIOMemory(
        this.decoderPtr,
        this.bufferPtr,
        bufferSize
      );
      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.free(this.bufferPtr);
        this.free(this.decoderPtr);
        throw new Error(`Failed to set IO memory: ${this.resultToStr(result)}`);
      }

      result = this.AwsmAvifDecode._avifDecoderParse(this.decoderPtr);
      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.free(this.bufferPtr);
        this.free(this.decoderPtr);
        throw new Error(`Failed to parse image: ${this.resultToStr(result)}`);
      }

      this.imageCount = this.AwsmAvifDecode._avifGetImageCount(this.decoderPtr);
      this.width = this.AwsmAvifDecode._avifGetImageWidth(this.decoderPtr);
      this.height = this.AwsmAvifDecode._avifGetImageHeight(this.decoderPtr);

      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.error(
          new Error(`Failed to decode image: ${this.resultToStr(result)}`)
        );
        if (this.bufferPtr) this.free(this.bufferPtr);
        return;
      }

      this.rbgPtr = this.AwsmAvifDecode._avifGetRGBImage();
    } catch (error) {
      this.error(new Error(`${error}`));
      if (this.bufferPtr) this.free(this.bufferPtr);
      if (this.decoderPtr) this.free(this.decoderPtr);
    }
  }

  avifDecoderNthImage(id: string, frameIndex: number) {
    let result = 0;
    let t1 = performance.now();
    if (
      (result = this.AwsmAvifDecode._avifDecoderNthImage(
        this.decoderPtr,
        frameIndex
      )) === AVIF_RESULT.AVIF_RESULT_OK
    ) {
      const imagePtr = this.AwsmAvifDecode._avifGetDecoderImage(
        this.decoderPtr
      );
      const timingPtr = this.AwsmAvifDecode._avifGetImageTiming(
        this.decoderPtr,
        frameIndex
      );
      const timing = this.getImageTiming(timingPtr);

      this.AwsmAvifDecode._avifRGBImageSetDefaults(this.rbgPtr, imagePtr);
      let result = this.AwsmAvifDecode._avifRGBImageAllocatePixels(this.rbgPtr);

      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.error(
          new Error(
            `Allocation of RGB samples failed:  ${this.resultToStr(result)}`
          )
        );
        this.free(this.rbgPtr);
      }

      result = this.AwsmAvifDecode._avifImageYUVToRGB(imagePtr, this.rbgPtr);
      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.error(
          new Error(`Conversion from YUV failed:  ${this.resultToStr(result)}`)
        );
      }
      const pixelsPtr = this.AwsmAvifDecode._avifGetRGBImagePixels(this.rbgPtr);
      const width = this.AwsmAvifDecode._avifGetRGBImageWidth(this.rbgPtr);
      const height = this.AwsmAvifDecode._avifGetRGBImageHeight(this.rbgPtr);
      const depth = this.AwsmAvifDecode._avifGetRGBImageDepth(this.rbgPtr);
      const _pixels = new Uint8ClampedArray(
        this.AwsmAvifDecode.HEAPU8.buffer,
        pixelsPtr,
        width * height * 4
      );
      const pixels = _pixels.slice();
      this.libavifWorker.send(
        WorkerAvifDecoderMessageChannel.avifDecoderNthImageResult,
        {
          id,
          timescale: timing.timescale,
          pts: timing.pts,
          ptsInTimescales: timing.ptsInTimescales,
          duration: timing.duration,
          durationInTimescales: timing.durationInTimescales,
          frameIndex,
          width,
          height,
          depth,
          decodeTime: performance.now() - t1,
        },
        pixels.buffer
      );

      this.AwsmAvifDecode._avifRGBImageFreePixels(this.rbgPtr);
      // this.free(this.rbgPtr!);
      this.free(timingPtr);
      // this.free(imagePtr);
    }

    if (frameIndex === this.imageCount) {
      this.libavifWorker.send(
        WorkerAvifDecoderMessageChannel.decodingComplete,
        {}
      );
    }
  }

  avifDecoderImage(id: string) {
    try {
      let result = 0;
      let frameIndex = 0;
      let t1 = performance.now();
      while (
        (result = this.AwsmAvifDecode._avifDecoderNextImage(
          this.decoderPtr
        )) === AVIF_RESULT.AVIF_RESULT_OK
      ) {
        this.decodeStats.push(performance.now() - t1);
        const total = this.decodeStats.reduce((a, b) => a + b, 0);
        const t2 = performance.now();
        const decodeTime = t2 - t1;
        t1 = t2;
        const rbgPtr = this.AwsmAvifDecode._avifGetRGBImage();

        const imagePtr = this.AwsmAvifDecode._avifGetDecoderImage(
          this.decoderPtr
        );
        this.AwsmAvifDecode._avifRGBImageSetDefaults(rbgPtr, imagePtr);
        result = this.AwsmAvifDecode._avifRGBImageAllocatePixels(rbgPtr);

        const timingPtr = this.AwsmAvifDecode._avifGetImageTiming(
          this.decoderPtr,
          frameIndex
        );
        const timing = this.getImageTiming(timingPtr);
        if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
          this.error(
            new Error(
              `Allocation of RGB samples failed:  ${this.resultToStr(result)}`
            )
          );
          this.free(timingPtr);
          this.free(rbgPtr);
        }
        result = this.AwsmAvifDecode._avifImageYUVToRGB(imagePtr, rbgPtr);
        if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
          this.error(
            new Error(
              `Conversion from YUV failed:  ${this.resultToStr(result)}`
            )
          );
        }
        const pixelsPtr = this.AwsmAvifDecode._avifGetRGBImagePixels(rbgPtr);
        const width = this.AwsmAvifDecode._avifGetRGBImageWidth(rbgPtr);
        const height = this.AwsmAvifDecode._avifGetRGBImageHeight(rbgPtr);
        const depth = this.AwsmAvifDecode._avifGetRGBImageDepth(rbgPtr);
        const _pixels = new Uint8ClampedArray(
          this.AwsmAvifDecode.HEAPU8.buffer,
          pixelsPtr,
          width * height * 4
        );
        const pixels = _pixels.slice();

        this.libavifWorker.send(
          WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
          {
            id,
            timescale: timing.timescale,
            pts: timing.pts,
            ptsInTimescales: timing.ptsInTimescales,
            duration: timing.duration,
            durationInTimescales: timing.durationInTimescales,
            frameIndex,
            width,
            height,
            depth,
            decodeTime,
          },
          pixels.buffer
        );

        frameIndex++;
        this.AwsmAvifDecode._avifRGBImageFreePixels(rbgPtr);
        this.free(timingPtr);
      }

      if (result === AVIF_RESULT.AVIF_RESULT_NO_IMAGES_REMAINING) {
        this.libavifWorker.send(
          WorkerAvifDecoderMessageChannel.decodingComplete,
          {}
        );
      }
    } catch (error) {
      console.log(error);

      // 处理错误
      this.error(new Error(`${error}`));
    } finally {
      if (this.bufferPtr) this.free(this.bufferPtr);
      if (this.decoderPtr)
        this.AwsmAvifDecode._avifDecoderDestroy(this.decoderPtr);
    }
  }

  getImageTiming(timingPtr: number): AvifImageTiming {
    // 直接访问Timing结构体的值
    const timescale = this.AwsmAvifDecode.getValue(timingPtr + 0, "double"); // Timing结构体中duration的偏移量为0
    const pts = this.AwsmAvifDecode.getValue(timingPtr + 8, "double");
    const ptsInTimescales = this.AwsmAvifDecode.getValue(timingPtr + 16, "i32");
    const duration = this.AwsmAvifDecode.getValue(timingPtr + 24, "double");
    const durationInTimescales = this.AwsmAvifDecode.getValue(
      timingPtr + 32,
      "i32"
    );
    return {
      timescale,
      pts,
      ptsInTimescales,
      duration,
      durationInTimescales,
    };
  }

  avifVersion() {
    return this.AwsmAvifDecode.UTF8ToString(
      this.AwsmAvifDecode._avifVersion()
    ) as string;
  }

  resultToStr(result: number) {
    return this.UTF8ToString(this.AwsmAvifDecode._avifResultToString(result));
  }

  error(error: Error) {
    this.libavifWorker.send(WorkerAvifDecoderMessageChannel.error, error);
  }

  free(ptr: number) {
    this.AwsmAvifDecode._free(ptr);
  }

  UTF8ToString(ptr: number) {
    return this.AwsmAvifDecode.UTF8ToString(ptr);
  }

  avifSetDecoderMaxThreads(threads: number = 4) {
    this.AwsmAvifDecode.ccall(
      "avifSetDecoderMaxThreads",
      "void",
      ["number", "number"],
      [this.decoderPtr, threads]
    );
  }

  print(data: any) {
    this.libavifWorker.send(
      WorkerAvifDecoderMessageChannel.avifDecoderConsole,
      data
    );
  }
}
