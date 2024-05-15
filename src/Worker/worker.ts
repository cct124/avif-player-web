import { EventMap, MessageType } from "../MessageType.js";
import avifDecodeFileWeb from "../Libavif/avifDecodeFileWeb.min.js";
import { WorkerEventEmitter } from "../Observer/index";

const channel = new WorkerEventEmitter<EventMap>();

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
  channel.send(MessageType.initial, version);
}

export default "";
