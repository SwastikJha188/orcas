// Opens the broker subscription when the server boots, so retained gateway
// state is already in memory before the first page asks for it.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
