import {
  WorkerAvifDecoderEventMap,
  WorkerAvifDecoderMessageChannel,
} from "../types/WorkerMessageType";
import { WorkerEventEmitter } from "../Observer/index";
import { AVIF_RESULT, AvifImageCache, AvifImageTiming } from "./type";

const AVIF_RGB_IMAGE_STRUCT_SIZE = 64;
const AVIF_RGB_IMAGE_TIMING_STRUCT_SIZE = 40;

export default class Libavif extends WorkerEventEmitter<WorkerAvifDecoderEventMap> {
  AwsmAvifDecode: any;
  decoderPtr?: number;
  bufferPtr?: number;
  avifImageCachePtr: number;
  index = 0;
  imageCount = 0;
  timingCache = new Map<string, AvifImageTiming[]>();
  constructor(awsmAvifDecode: any) {
    super();
    this.AwsmAvifDecode = awsmAvifDecode;
    this.avifImageCachePtr = this.AwsmAvifDecode._avifCreateAvifImageCache();

    this.on(
      WorkerAvifDecoderMessageChannel.avifDecoderParse,
      ({ id }, arrayBuffer) => {
        if (id && arrayBuffer?.byteLength) {
          this.avifDecoderParse(arrayBuffer);
          if (this.imageCount > 0) {
            console.log(id);

            this.avifInitializeCacheEntry(id, this.imageCount);
            this.AwsmAvifDecode.ccall(
              "avifCacheImagePrintCache",
              "void",
              ["number"],
              [this.avifImageCachePtr]
            );

            this.timingCache.set(id, new Array(this.imageCount).fill(null));
          } else {
            throw new Error(`没有图像数据，imageCount：${this.imageCount}`);
          }
        } else {
          throw new Error(`参数错误 id: ${id} arrayBuffer: ${arrayBuffer}`);
        }
      }
    );
    this.on(WorkerAvifDecoderMessageChannel.avifDecoderImage, ({ id }) => {
      this.avifDecoderImage(id);
    });
    this.on(
      WorkerAvifDecoderMessageChannel.avifDecoderNthImage,
      ({ id, frameIndex }) => {
        this.avifDecoderNthImage(id, frameIndex);
      }
    );
    this.send(WorkerAvifDecoderMessageChannel.initial, this.avifVersion());
  }

  avifDecoderParse(arrayBuffer: ArrayBuffer) {
    try {
      // Allocate and copy the image file data to WASM memory
      const bufferSize = arrayBuffer.byteLength;
      // await onRuntimeInitialized;
      this.bufferPtr = this.AwsmAvifDecode._malloc(bufferSize);
      this.AwsmAvifDecode.HEAPU8.set(
        new Uint8Array(arrayBuffer),
        this.bufferPtr
      );

      // Create AVIF decoder
      this.decoderPtr = this.AwsmAvifDecode._avifDecoderCreate();
      if (!this.decoderPtr) {
        this.error(new Error("Memory allocation failure"));
        return;
      }

      // Set IO memory
      let result = this.AwsmAvifDecode._avifDecoderSetIOMemory(
        this.decoderPtr,
        this.bufferPtr,
        bufferSize
      );

      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.error(
          new Error(`Failed to set IO memory: ${this.resultToStr(result)}`)
        );
        if (this.bufferPtr) this.free(this.bufferPtr);
        return;
      }

      // Parse the image
      result = this.AwsmAvifDecode._avifDecoderParse(this.decoderPtr);
      if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
        this.error(
          new Error(`Failed to decode image: ${this.resultToStr(result)}`)
        );
        if (this.bufferPtr) this.free(this.bufferPtr);
        return;
      }
      this.imageCount = this.AwsmAvifDecode._avifGetImageCount(this.decoderPtr);
      this.send(WorkerAvifDecoderMessageChannel.avifDecoderParseComplete, {
        imageCount: this.imageCount,
      });
    } catch (error) {
      this.error(new Error(`${error}`));
      if (this.bufferPtr) this.free(this.bufferPtr);
      if (this.decoderPtr) this.free(this.decoderPtr);
    } finally {
    }
  }

  avifDecoderNthImage(id: string, frameIndex: number) {
    if (!this.timingCache.has(id)) throw new Error(`未初始化解码器 ID: #{id}`);
    const timings = this.timingCache.get(id)!;
    const imagePtr = this.avifGetCacheImage(id, frameIndex);
    if (imagePtr) {
      let t1 = performance.now();
      const timing = timings[frameIndex];
      this.avifDecoderNthImageResult(id, imagePtr, timing, frameIndex, t1);
    } else {
      let t1 = performance.now();
      let result = 0;

      if (
        (result = this.AwsmAvifDecode._avifDecoderNthImage(
          this.decoderPtr,
          frameIndex
        )) === AVIF_RESULT.AVIF_RESULT_OK
      ) {
        const srcImage = this.AwsmAvifDecode._avifGetDecoderImage(
          this.decoderPtr
        );
        const timingPtr = this.AwsmAvifDecode._avifGetImageTiming(
          this.decoderPtr,
          frameIndex
        );
        const dstImage = this.AwsmAvifDecode._avifGetCreateImage();
        this.AwsmAvifDecode._avifGetCopyImage(srcImage, dstImage);
        const timing = this.getImageTiming(timingPtr);
        timings[frameIndex] = timing;
        this.avifCacheImage(id, dstImage, frameIndex);
        this.avifDecoderNthImageResult(id, dstImage, timing, frameIndex, t1);
      } else if (result === AVIF_RESULT.AVIF_RESULT_NO_IMAGES_REMAINING) {
        if (this.bufferPtr) this.free(this.bufferPtr);
        if (this.decoderPtr)
          this.AwsmAvifDecode._avifDecoderDestroy(this.decoderPtr);
      }
    }
  }

  avifDecoderNthImageResult(
    id: string,
    imagePtr: number,
    timing: AvifImageTiming,
    index: number,
    t1: number
  ) {
    const rbgPtr = this.AwsmAvifDecode._avifGetRGBImage();

    this.AwsmAvifDecode._avifRGBImageSetDefaults(rbgPtr, imagePtr);
    let result = this.AwsmAvifDecode._avifRGBImageAllocatePixels(rbgPtr);

    if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
      this.error(
        new Error(
          `Allocation of RGB samples failed:  ${this.resultToStr(result)}`
        )
      );
      this.free(rbgPtr);
    }

    result = this.AwsmAvifDecode._avifImageYUVToRGB(imagePtr, rbgPtr);
    if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
      this.error(
        new Error(`Conversion from YUV failed:  ${this.resultToStr(result)}`)
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
    this.send(
      WorkerAvifDecoderMessageChannel.avifDecoderNthImageResult,
      {
        id,
        timescale: timing.timescale,
        pts: timing.pts,
        ptsInTimescales: timing.ptsInTimescales,
        duration: timing.duration,
        durationInTimescales: timing.durationInTimescales,
        index,
        width,
        height,
        depth,
        decodeTime: performance.now() - t1,
      },
      pixels.buffer
    );
    this.AwsmAvifDecode._avifRGBImageFreePixels(rbgPtr);
    this.free(rbgPtr);
  }

  avifDecoderImage(id: string) {
    try {
      let result = 0;
      let index = 0;
      let t1 = performance.now();

      while (
        (result = this.AwsmAvifDecode._avifDecoderNextImage(
          this.decoderPtr
        )) === AVIF_RESULT.AVIF_RESULT_OK
      ) {
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
          index
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
        this.send(
          WorkerAvifDecoderMessageChannel.avifDecoderNextImage,
          {
            id,
            timescale: timing.timescale,
            pts: timing.pts,
            ptsInTimescales: timing.ptsInTimescales,
            duration: timing.duration,
            durationInTimescales: timing.durationInTimescales,
            index,
            width,
            height,
            depth,
            decodeTime,
          },
          pixels.buffer
        );

        index++;
        this.AwsmAvifDecode._avifRGBImageFreePixels(rbgPtr);
        // this.free(imagePtr);
        // this.free(rbgPtr);
        this.free(timingPtr);
      }

      if (result === AVIF_RESULT.AVIF_RESULT_NO_IMAGES_REMAINING) {
        this.send(WorkerAvifDecoderMessageChannel.decodingComplete, {});
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

  avifInitializeCacheEntry(id: string, count: number) {
    this.AwsmAvifDecode.ccall(
      "avifInitializeCacheEntry",
      "void",
      ["number", "string", "number"],
      [this.avifImageCachePtr, id, count]
    );
  }

  avifGetCacheImage(id: string, index: number): number {
    return this.AwsmAvifDecode.ccall(
      "avifGetCacheImage",
      "number",
      ["number", "string", "number"],
      [this.avifImageCachePtr, id, index]
    );
  }

  avifCacheImage(id: string, image: number, index: number) {
    this.AwsmAvifDecode.ccall(
      "avifCacheImage",
      "void",
      ["number", "string", "number", "number"],
      [this.avifImageCachePtr, id, image, index]
    );
  }

  resultToStr(result: number) {
    return this.UTF8ToString(this.AwsmAvifDecode._avifResultToString(result));
  }

  error(error: Error) {
    this.send(WorkerAvifDecoderMessageChannel.error, error);
  }

  free(ptr: number) {
    this.AwsmAvifDecode._free(ptr);
  }

  UTF8ToString(ptr: number) {
    return this.AwsmAvifDecode.UTF8ToString(ptr);
  }
}
