/** Traces a line sheet's equipment outline off the main thread (see `art-outline.ts`). */
import { trace, type TraceRequest } from "./art-outline-trace";

self.onmessage = (e: MessageEvent<TraceRequest>) => {
  const { mask, w, h, opts } = e.data;
  self.postMessage(trace(mask, w, h, opts));
};
