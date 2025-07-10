import { AICreateMonitor } from './AICoreTypes'

/**
 * Creates a download progress callback function
 * @param monitorTarget: the monitor target to emit events for
 * @param signal: an abort signal
 * @returns a function that can be used as the stream callback to monitor download progress
 */
export function createDownloadProgressFn (monitorTarget: AICreateMonitor, signal?: AbortSignal) {
  return (chunk: any) => {
    if (signal?.aborted) { return }
    if (!chunk) { return }

    const downloadProgress = chunk
    const evt: Event & { loaded?: number, total?: number, model?: string } = new Event('downloadprogress')
    evt.loaded = downloadProgress.loaded
    evt.total = downloadProgress.total
    evt.model = downloadProgress.model
    monitorTarget.dispatchEvent(evt)
    if (typeof monitorTarget.ondownloadprogress === 'function') {
      monitorTarget.ondownloadprogress(evt)
    }
  }
}

/**
 * Converts a readable prompt stream to a single string
 * @param stream: the prompt stream
 * @returns the last string that was output
 */
export async function readablePromptStreamToString (stream: ReadableStream) {
  let content = ''
  for await (const chunk of stream) {
    content += chunk
  }
  return content
}
