import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
import Libavif from "./Libavif";


let libavif: Libavif;
initialAvifDecodeFileWeb();

async function initialAvifDecodeFileWeb() {
  const AvifDecodeFileWeb = await avifDecodeFileWeb();
  libavif = new Libavif(AvifDecodeFileWeb);
}

// function submitDecoding(arrayBuffer: ArrayBuffer) {
//   decoder(arrayBuffer);
// }

// function msgError(error: Error) {
//   channel.send(WorkerAvifDecoderMessageChannel.error, error);
// }

// async function decoder(arrayBuffer: ArrayBuffer) {
//   // Allocate and copy the image file data to WASM memory
//   const bufferSize = arrayBuffer.byteLength;
//   // await onRuntimeInitialized;
//   const bufferPtr = AvifDecodeFileWeb._malloc(bufferSize);
//   AvifDecodeFileWeb.HEAPU8.set(new Uint8Array(arrayBuffer), bufferPtr);

//   // Create AVIF decoder
//   const decoderPtr = AvifDecodeFileWeb._avifDecoderCreate();
//   if (!decoderPtr) {
//     msgError(new Error("Memory allocation failure"));
//     return;
//   }

//   // Set IO memory
//   let result = AvifDecodeFileWeb._avifDecoderSetIOMemory(
//     decoderPtr,
//     bufferPtr,
//     bufferSize
//   );

//   if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
//     msgError(new Error(`Failed to set IO memory: ${resToString(result)}`));
//     free(bufferPtr);
//     return;
//   }

//   // Parse the image
//   result = AvifDecodeFileWeb._avifDecoderParse(decoderPtr);
//   if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
//     msgError(new Error(`Failed to decode image: ${resToString(result)}`));
//     free(bufferPtr);
//     return;
//   }
//   const imageCount = AvifDecodeFileWeb._avifGetImageCount(decoderPtr);
//   channel.send(WorkerAvifDecoderMessageChannel.imageCount, imageCount);
//   /**
//    * 帧索引
//    */
//   let index = 0;
//   while ((result = AvifDecodeFileWeb._avifDecoderNextImage(decoderPtr)) === 0) {
//     index++;
//     const rbgPtr = AvifDecodeFileWeb._malloc(AVIF_RGB_IMAGE_STRUCT_SIZE); // Assuming avifRGBImage size is 32 bytes
//     AvifDecodeFileWeb.HEAP8.fill(
//       0,
//       rbgPtr,
//       rbgPtr + AVIF_RGB_IMAGE_STRUCT_SIZE
//     );

//     const imagePtr = AvifDecodeFileWeb._avifGetDecoderImage(decoderPtr);
//     AvifDecodeFileWeb._avifRGBImageSetDefaults(rbgPtr, imagePtr);
//     result = AvifDecodeFileWeb._avifRGBImageAllocatePixels(rbgPtr);

//     const timingPtr = AvifDecodeFileWeb._avifGetImageTiming(decoderPtr, index);
//     const timing = getImageTiming(timingPtr);
//     if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
//       msgError(
//         new Error(`Allocation of RGB samples failed:  ${resToString(result)}`)
//       );
//       free(timingPtr);
//       free(rbgPtr);
//     }
//     result = AvifDecodeFileWeb._avifImageYUVToRGB(imagePtr, rbgPtr);
//     if (result !== AVIF_RESULT.AVIF_RESULT_OK) {
//       msgError(
//         new Error(`Conversion from YUV failed:  ${resToString(result)}`)
//       );
//     }
//     const pixelsPtr = AvifDecodeFileWeb._avifGetRGBImagePixels(rbgPtr);
//     const width = AvifDecodeFileWeb._avifGetRGBImageWidth(rbgPtr);
//     const height = AvifDecodeFileWeb._avifGetRGBImageHeight(rbgPtr);
//     const depth = AvifDecodeFileWeb._avifGetRGBImageDepth(rbgPtr);
//     const _pixels = new Uint8ClampedArray(
//       AvifDecodeFileWeb.HEAPU8.buffer,
//       pixelsPtr,
//       width * height * 4
//     );
//     const pixels = _pixels.slice();
//     channel.send(
//       WorkerAvifDecoderMessageChannel.decoderImageData,
//       {
//         ...timing,
//         index,
//         width,
//         height,
//         depth,
//         pixels: pixels.buffer,
//       },
//       [pixels.buffer]
//     );

//     AvifDecodeFileWeb._avifRGBImageFreePixels(rbgPtr);
//     free(rbgPtr);
//     free(timingPtr);
//   }

//   if (result === AVIF_RESULT.AVIF_RESULT_NO_IMAGES_REMAINING)
//     channel.send(WorkerAvifDecoderMessageChannel.decodingComplete);

//   free(bufferPtr);
//   AvifDecodeFileWeb._avifDecoderDestroy(decoderPtr);
// }

// function getImageTiming(timingPtr: number) {
//   // 直接访问Timing结构体的值
//   const timescale = AvifDecodeFileWeb.getValue(timingPtr + 0, "double"); // Timing结构体中duration的偏移量为0
//   const pts = AvifDecodeFileWeb.getValue(timingPtr + 8, "double");
//   const ptsInTimescales = AvifDecodeFileWeb.getValue(timingPtr + 16, "i32");
//   const duration = AvifDecodeFileWeb.getValue(timingPtr + 24, "double");
//   const durationInTimescales = AvifDecodeFileWeb.getValue(
//     timingPtr + 32,
//     "i32"
//   );
//   return {
//     timescale,
//     pts,
//     ptsInTimescales,
//     duration,
//     durationInTimescales,
//   };
// }

// function resToString(result: number) {
//   return ptrUTF8ToString(AvifDecodeFileWeb._avifResultToString(result));
// }

// function ptrUTF8ToString(ptr: number) {
//   return AvifDecodeFileWeb.UTF8ToString(ptr);
// }

// function free(ptr: number) {
//   AvifDecodeFileWeb._free(ptr);
// }

export default "";
