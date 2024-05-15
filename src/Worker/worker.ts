import {
  WorkerEventMap,
  WorkerMessageChannel,
} from "../types/WorkerMessageType";
import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
import { WorkerEventEmitter } from "../Observer/index";

const channel = new WorkerEventEmitter<WorkerEventMap>();

let AvifDecodeFileWeb;
initialAvifDecodeFileWeb();

// onmessage = async (e: any) => {
//   console.log(e);
// };

async function initialAvifDecodeFileWeb() {
  AvifDecodeFileWeb = await avifDecodeFileWeb();
  const version = AvifDecodeFileWeb.UTF8ToString(
    AvifDecodeFileWeb._avifVersion()
  );
  channel.send(WorkerMessageChannel.initial, version);
}

export default "";
