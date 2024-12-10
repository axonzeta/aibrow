/**
 * Creates a download progress callback function
 * @param monitorTarget: the monitor target to emit events for
 * @param signal: an abort signal
 * @returns a function that can be used as the stream callback to monitor download progress
 */
export function createDownloadProgressFn (monitorTarget: EventTarget, signal?: AbortSignal) {
  return (downloadProgress: { loaded: number, total: number, model: string }) => {
    if (signal?.aborted) { return }

    const evt: Event & { loaded?: number, total?: number, model?: string } = new Event('downloadprogress')
    evt.loaded = downloadProgress.loaded
    evt.total = downloadProgress.total
    evt.model = downloadProgress.model
    monitorTarget.dispatchEvent(evt)
  }
}

/**
 * Converts a readable prompt stream to a single string
 * @param stream: the prompt stream
 * @returns the last string that was output
 */
export async function readablePromptStreamToString (stream: ReadableStream) {
  let last = ''
  for await (const chunk of stream) {
    last = chunk
  }
  return last
}