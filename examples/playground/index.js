import './index.scss'
import Logger from './Logger.js'
import AIResult from './AIResult.js'
import ModelDownload from './ModelDownload.js'
import Controls from './Controls.js'
import deepEqual from 'fast-deep-equal'
import Samples from './Samples.js'

let aiSession

Logger.logTask('Checking for window.ai...', (log) => {
  log(!!window.ai)
})
Logger.logTask('Checking for window.aibrow...', (log) => {
  log(!!window.aibrow)

  if (!window.aibrow) {
    document.getElementById('not-installed').classList.remove('d-none')
  }
})

/* **************************************************************************/
// MARK: Capabilities
/* **************************************************************************/

/**
 * Updates the capabilities based on the current tool and model
 */
async function updateCapabilities () {
  const tool = Controls.getTool()

  AIResult.clear()

  // Update the dom with default values and bounds
  if (window.aibrow?.[tool]?.capabilities) {
    const capabilities = await window.aibrow[tool].capabilities({ model: Controls.getModel() })
    Controls.replaceSelectOptions('gpu-engine', {
      '': 'Default',
      ...capabilities.gpuEngines.reduce((acc, v) => ({ ...acc, [v]: v }), {})
    }, '')
    const $topK = Controls.getField('top-k')
    const defaultTopK = capabilities.defaultTopK ?? 3
    const maxTopK = capabilities.maxTopK ?? 8
    $topK.value = defaultTopK
    $topK.setAttribute('max', maxTopK)
    Controls.setTooltip($topK, `${0} - ${maxTopK}`)

    const $topP = Controls.getField('top-p')
    const defaultTopP = capabilities.defaultTopP ?? 0.9
    const maxTopP = capabilities.maxTopP ?? 3
    $topP.value = defaultTopP
    $topP.setAttribute('max', maxTopP)
    Controls.setTooltip($topP, `${0} - ${maxTopP}`)

    const $temperature = Controls.getField('temperature')
    const defaultTemperature = capabilities.defaultTemperature ?? 0.5
    const maxTemperature = capabilities.maxTemperature ?? 1
    $temperature.value = defaultTemperature
    $temperature.setAttribute('max', maxTemperature)
    Controls.setTooltip($temperature, `${0} - ${maxTemperature}`)

    const $repeatPenalty = Controls.getField('repeat-penalty')
    const defaultRepeatPenalty = capabilities.defaultRepeatPenalty ?? 1
    const maxRepeatPenalty = capabilities.maxRepeatPenalty ?? 3
    $repeatPenalty.value = defaultRepeatPenalty
    $repeatPenalty.setAttribute('max', maxRepeatPenalty)
    Controls.setTooltip($repeatPenalty, `${0} - ${maxRepeatPenalty}`)

    const $contextSize = Controls.getField('context-size')
    const defaultContextSize = capabilities.defaultContextSize ?? 1024
    const maxContextSize = capabilities.maxContextSize ?? 2048
    $contextSize.value = defaultContextSize
    $contextSize.setAttribute('max', maxContextSize)
    Controls.setTooltip($contextSize, `${0} - ${maxContextSize}`)

    Controls.getField('flash-attention').checked = capabilities.defaultFlashAttention ?? true
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
  const tool = Controls.getTool()
  const modelData = Controls.getData()
  const toolData = Controls.getData(tool)

  // Build the create & prompt options
  const createOptions = {
    ...modelData,
    model: Controls.getModel()
  }
  const promptOptions = {}

  switch (tool) {
    case 'coreModel': {
      Controls.clearError(Controls.getField('grammar', tool))
      if (toolData.grammar) {
        try {
          createOptions.grammar = JSON.parse(toolData.grammar)
        } catch (ex) {
          Controls.showError(Controls.getField('grammar', tool), 'Invalid JSON')
          return
        }
      }
      break
    }
    case 'languageModel': {
      createOptions.systemPrompt = toolData.systemPrompt
      break
    }
    case 'summarizer': {
      createOptions.type = toolData.type
      createOptions.format = toolData.format
      createOptions.length = toolData.length
      promptOptions.context = toolData.context
      break
    }
    case 'rewriter':
    case 'writer': {
      createOptions.tone = toolData.tone
      createOptions.format = toolData.format
      createOptions.length = toolData.length
      promptOptions.context = toolData.context
      break
    }
  }

  Controls.disable()

  try {
    // Add the user message
    AIResult.addMessage('User', toolData.input)

    // Check if the model is available
    Logger.logTask('Check model availability...', async (log) => {
      const capabilities = await window.aibrow[tool].capabilities({ model: Controls.getModel() })
      switch (capabilities.available) {
        case 'readily': log(true); break
        case 'after-download': log('Download required'); break
        case 'no': log(false); break
      }
    })

    // Create the session
    if (aiSession?.session && deepEqual(aiSession.createOptions, createOptions)) {
      await Logger.logTask('Reusing session...', async (log) => log(true))
    } else {
      aiSession?.session?.destroy?.()
      aiSession = {
        createOptions,
        session: await Logger.logTask('Creating session...', async (log) => {
          log(createOptions)
          const res = await ModelDownload.createMonitor(async (monitor) => {
            return await window.aibrow[tool].create({ ...createOptions, monitor })
          })
          log(true)
          return res
        })
      }
    }

    // Prompt the model
    const updateAssistantMessage = AIResult.addMessage('Assistant', '...')
    let stream
    switch (tool) {
      case 'languageModel':
      case 'coreModel': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOptions)
          const stream = await aiSession.session.promptStreaming(toolData.input, promptOptions)
          log(true)
          return stream
        })
        break
      }
      case 'summarizer': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOptions)
          const stream = await aiSession.session.summarizeStreaming(toolData.input, promptOptions)
          log(true)
          return stream
        })
        break
      }
      case 'rewriter': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOptions)
          const stream = await aiSession.session.rewriteStreaming(toolData.input, promptOptions)
          log(true)
          return stream
        })
        break
      }
      case 'writer': {
        stream = await Logger.logTask('Start streaming...', async (log) => {
          log(promptOptions)
          const stream = await aiSession.session.writeStreaming(toolData.input, promptOptions)
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
    if (aiSession.session) {
      aiSession.session.destroy()
      aiSession.session = undefined
    }
    log(true)
  })
})

/* **************************************************************************/
// MARK: Samples
/* **************************************************************************/

for (const [key, config] of Object.entries(Samples)) {
  const $menu = document.querySelector(`[data-action="sample-${key}"]`)
  $menu.addEventListener('click', async (evt) => {
    evt.preventDefault()

    AIResult.clear()
    Controls.getField('tool').value = config.tool
    Controls.showTool(config.tool)
    await updateCapabilities()

    if (config.forms.model) {
      for (const [name, value] of Object.entries(config.forms.model)) {
        Controls.getField(name).value = value
      }
    }

    for (const [name, value] of Object.entries(config.forms.tool)) {
      Controls.getField(name, config.tool).value = value
    }
  })
}
