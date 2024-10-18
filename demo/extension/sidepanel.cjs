const ai = require('aibrow-extension').default
window.__ai=ai

const $model = document.getElementById('model')
const $streaming = document.getElementById('streaming')
const $input = document.getElementById('input')
const $system = document.getElementById('system')
const $go = document.getElementById('go')
const $progressBox = document.getElementById('progress-box')
const $progress = document.getElementById('progress')
const $output = document.getElementById('output')
const $log = document.getElementById('log')
const $dispose = document.getElementById('dispose')

let session

const enableAll = () => {
  Array.from(document.querySelectorAll('input, button, textarea, select')).forEach(($el) => {
    $el.removeAttribute('disabled')
  })
}

const disableAll = () => {
  Array.from(document.querySelectorAll('input, button, textarea, select')).forEach(($el) => {
    $el.setAttribute('disabled', 'disabled')
  })
}

const log = (msg) => {
  console.log(msg)
  const $el = document.createElement('div')
  $el.innerText = msg
  $log.appendChild($el)

  return (msg) => {
    console.log(msg)
    switch (typeof msg) {
      case 'boolean':
        $el.innerText += (msg ? ' ✅' : ' ❌')
        break
      default:
        $el.innerText += ` ${msg}`
        break
    }
  }
}

const logTask = async (msg, fn) => {
  return await fn(log(msg))
}

const createMessage = (header) => {
  const $message = document.createElement('div')
  $message.style.margin = '6px 0'
  const $messageHeader = document.createElement('div')
  $messageHeader.innerText = header
  $messageHeader.style.fontWeight = 'bold'
  $message.appendChild($messageHeader)
  const $messageBody = document.createElement('div')
  $messageBody.innerText = '...'
  $message.appendChild($messageBody)

  return { $message, $messageBody }
}

logTask('Checking for ai...', (log) => {
  log(!!ai)
})

$go.addEventListener('click', async () => {
  const model = $model.value
  const input = $input.value
  const system = $system.value
  const streaming = $streaming.checked

  disableAll()

  try {
    const sessionOpts = {
      /*
      initialPrompts: [
        { role: 'user', content: 'Start every paragraph with "Once upon a time"' },
        { role: 'assistant', content: 'Once upon a time, I understood the instruction' }
      ],
      */
      ...system ? { systemPrompt: system } : undefined,
      ...model === 'default' ? undefined : { model },
      monitor: (m) => {
        m.addEventListener('downloadprogress', (evt) => {
          const percent = Math.round(evt.loaded / evt.total * 100)
          $progress.style.width = `${percent}%`
          $progress.innerText = `${percent}% ${evt.model}`
        })
      }
    }

    {
      const logRes = log('Check model availability...')
      switch ((await ai.assistant.capabilities(sessionOpts)).available) {
        case 'readily':
          logRes(true)
          break
        case 'after-download':
          $progressBox.classList.remove('d-none')
          $progress.style.width = '0%'
          $progress.innerText = '0%'
          logRes('Download required')
          break
        case 'no':
          logRes(false)
          return
      }
    }

    const { $message: $userMessage, $messageBody: $userMessageBody } = createMessage('User')
    $userMessageBody.innerText = input
    $output.appendChild($userMessage)
    const { $message, $messageBody } = createMessage('Assistant')
    $output.appendChild($message)

    if (session) {
      await logTask('Reusing session...', async (log) => {
        log(true)
      })
    } else {
      session = await logTask('Creating session...', async (log) => {
        const res = await ai.assistant.create(sessionOpts)
        log(true)
        return res
      })
    }

    $progressBox.classList.add('d-none')

    if (streaming) {
      const stream = await logTask('Start streaming...', async (log) => {
        const stream = await session.promptStreaming(input)
        log(true)
        return stream
      })

      for await (const chunk of stream) {
        $messageBody.innerText = chunk
      }
    } else {
      const output = await logTask('Prompting...', async (log) => {
        const output = await session.prompt(input)
        log(true)
        return output
      })

      $messageBody.innerText = output
    }

    log(`Tokens=${session.tokensSoFar} Tokens left=${session.tokensLeft}`)
  } finally {
    enableAll()
  }
})

$dispose.addEventListener('click', async () => {
  if (!window.confirm('Are you sure?')) { return }
  $output.innerHTML = ''
  await logTask('Destroying session...', async (log) => {
    if (session) {
      session.destroy()
      session = undefined
    }
    log(true)
  })
})
