import './index.scss'
import Logger from './Logger.js'
import AIResult from './AIResult.js'
import ModelDownload from './ModelDownload.js'
import Controls from './Controls.js'

let session

Logger.logTask('Checking for window.ai...', (log) => {
  log(!!window.ai)
})
Logger.logTask('Checking for window.aibrow...', (log) => {
  log(!!window.aibrow)
})

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

/**
 * Updates the capabilities based on the current tool and model
 */
async function updateCapabilities () {
  const tool = Controls.getTool()

  // Create a new session
  if (session) {
    await Logger.logTask('Destroying session...', async (log) => {
      session.destroy()
      session = undefined
      log(true)
    })
  }

  // Update the dom with default values and bounds
  if (window.aibrow?.[tool]?.capabilities) {
    const capabilities = await window.aibrow[tool].capabilities({ model: Controls.getModel() })
    Controls.replaceSelectOptions('gpu-engine', {
      '': 'Default',
      ...capabilities.gpuEngines.reduce((acc, v) => ({ ...acc, [v]: v }), {})
    }, '')
    Controls.getField('top-k').value = capabilities.defaultTopK ?? 3
    Controls.getField('top-k').setAttribute('max', capabilities.maxTopK ?? 8)
    Controls.getField('top-p').value = capabilities.defaultTopP ?? 3
    Controls.getField('top-p').setAttribute('max', capabilities.maxTopP ?? 8)
    Controls.getField('temperature').value = capabilities.defaultTemperature ?? 1
    Controls.getField('temperature').setAttribute('max', capabilities.maxTemperature ?? 1)
    Controls.getField('repeat-penalty').value = capabilities.defaultRepeatPenalty ?? 1
    Controls.getField('repeat-penalty').setAttribute('max', capabilities.maxRepeatPenalty ?? 3)
    Controls.getField('flash-attention').checked = capabilities.defaultFlashAttention ?? true
    Controls.getField('context-size').value = capabilities.defaultContextSize ?? 1024
    Controls.getField('context-size').setAttribute('max', capabilities.maxContextSize ?? 2048)
  }
}
Controls.onCapabilitiesChanged(updateCapabilities)
updateCapabilities()

/* **************************************************************************/
// MARK: UI Events
/* **************************************************************************/

/**
 * Handles the user clicking submit
 */
Controls.onSubmitClicked(async () => {
  const createOpts = Controls.getData('create')
  const promptOpts = Controls.getData('prompt')
  const tool = Controls.getTool()
  Controls.disable()

  try {
    // Add the user message
    AIResult.addMessage('User', promptOpts.input)

    // Check if the model is available
    Logger.logTask('Check model availability...', async (log) => {
      const capabilities = await window.ai[tool].capabilities({ model: Controls.getModel() })
      switch (capabilities.available) {
        case 'readily': log(true); break
        case 'after-download': log('Download required'); break
        case 'no': log(false); break
      }
    })

    // Create the session
    if (session) {
      await Logger.logTask('Reusing session...', async (log) => log(true))
    } else {
      session = await Logger.logTask('Creating session...', async (log) => {
        log(createOpts)
        const res = await ModelDownload.createMonitor(async (monitor) => {
          return await window.ai[tool].create({ ...createOpts, monitor })
        })
        log(true)
        return res
      })
    }

    // Prompt the model
    const updateAssistantMessage = AIResult.addMessage('Assistant', '...')
    let stream
    switch (tool) {
      case 'languageModel':
      case 'coreModel': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOpts)
          const stream = await session.promptStreaming(promptOpts.input, promptOpts)
          log(true)
          return stream
        })
        break
      }
      case 'summarizer': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOpts)
          const stream = await session.summarizeStreaming(promptOpts.input, promptOpts)
          log(true)
          return stream
        })
        break
      }
      case 'rewriter': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOpts)
          const stream = await session.rewriteStreaming(promptOpts.input, promptOpts)
          log(true)
          return stream
        })
        break
      }
      case 'writer': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOpts)
          const stream = await session.writeStreaming(promptOpts.input, promptOpts)
          log(true)
          return stream
        })
        break
      }
    }

    for await (const chunk of stream) {
      updateAssistantMessage(chunk)
    }
  } finally {
    Controls.enable()
  }
})

Controls.onResetClicked(async () => {
  if (!window.confirm('Are you sure?')) { return }
  AIResult.clear()
  await Logger.logTask('Destroying session...', async (log) => {
    if (session) {
      session.destroy()
      session = undefined
    }
    log(true)
  })
})
