import './index.less'
import 'bootstrap/dist/css/bootstrap.min.css'
import * as UI from './ui'
import {
  kGetInstalledModels,
  kUninstallModel,
  kGetInfo,
  kUpdateNativeBinary,
  kGetSupportedGpuEngines
} from '#Shared/BackgroundAPI/ManagementIPC'
import {
  AIModelManifest,
  AIModelStats,
  getModelSize
} from '#Shared/AIModelManifest'
import { filesize } from 'filesize'
import {
  getAllSitePermissionsGroupedByOrigin,
  setSiteModelPermission
} from '#Shared/Permissions/AISitePermissions'
import IPCBackgroundMessager from '#Shared/IPC/IPCBackgroundMessager'
import {
  getDefaultModel,
  setDefaultModel,
  getUseBrowserAI,
  setUseBrowserAI,
  setDefaultModelEngine,
  getDefaultModelEngine,
  setModelUpdatePeriod,
  ModelUpdatePeriod,
  getModelUpdatePeriod
} from '#Shared/Prefs'
import Config from '#Shared/Config'
import { AICapabilityGpuEngine } from '#Shared/API/AICapability'
import { UpdateResult } from '#Shared/Updater'

/* **************************************************************************/
// MARK: Settings
/* **************************************************************************/

const kBrowserAiModelId = '__browser__'

function renderDefaultModelOptions (
  $el: HTMLSelectElement,
  selectedModelId: string,
  useBrowserAI: boolean,
  modelList: Array<{ id: string, name: string }>
) {
  UI.empty($el)

  if ((window as any).ai?.assistant) {
    modelList = [{ id: kBrowserAiModelId, name: 'Browser AI' }, ...modelList]
  }

  for (const model of modelList) {
    const $option = document.createElement('option')
    $option.value = model.id
    $option.textContent = model.name
    if (model.id === kBrowserAiModelId) {
      if (useBrowserAI) {
        $option.selected = true
      }
    } else {
      if (model.id === selectedModelId) {
        if ((useBrowserAI && modelList.some(({ id }) => id === kBrowserAiModelId)) === false) {
          $option.selected = true
        }
      }
    }
    $el.appendChild($option)
  }
}

async function renderDefaultEngineOptions (
  $el: HTMLSelectElement,
  selectedModelEngine: AICapabilityGpuEngine | undefined,
  supportedEngines: Array<AICapabilityGpuEngine>
) {
  UI.empty($el)

  const $option = document.createElement('option')
  $option.textContent = 'Auto'
  if (selectedModelEngine === undefined) {
    $option.selected = true
  }
  $el.appendChild($option)

  for (const engine of supportedEngines) {
    const $option = document.createElement('option')
    $option.value = engine
    $option.textContent = engine[0].toUpperCase() + engine.slice(1)
    if (engine === selectedModelEngine) {
      $option.selected = true
    }
    $el.appendChild($option)
  }
}

async function renderSettings () {
  // Default model
  const $defaultModelOpt = document.getElementById('opt-model-default') as HTMLSelectElement
  $defaultModelOpt.addEventListener('change', async () => {
    const modelId = ($defaultModelOpt as HTMLSelectElement).value

    if (modelId === kBrowserAiModelId) {
      await setUseBrowserAI(true)
    } else {
      await setUseBrowserAI(false)
      await setDefaultModel(modelId)
    }
  })
  ;(async () => {
    const useBrowserAI = await getUseBrowserAI()
    const defaultModelId = await getDefaultModel()
    const defaultModelList = [...new Set([defaultModelId, Config.defaultAiModel])].map((modelId) => ({ id: modelId, name: modelId }))
    renderDefaultModelOptions($defaultModelOpt, defaultModelId, useBrowserAI, defaultModelList)

    const res = await fetch('https://aibrow.ai/api/model/list.json')
    if (res.ok) {
      const { models } = await res.json()
      renderDefaultModelOptions($defaultModelOpt, defaultModelId, useBrowserAI, models)
    }
  })()

  // Default engine
  const $defaultEngineOpt = document.getElementById('opt-engine-default') as HTMLSelectElement
  $defaultEngineOpt.addEventListener('change', async () => {
    const id = ($defaultEngineOpt as HTMLSelectElement).value
    const supportedEngines = await IPCBackgroundMessager.request(kGetSupportedGpuEngines) as Array<AICapabilityGpuEngine>
    if (supportedEngines.includes(id as AICapabilityGpuEngine)) {
      await setDefaultModelEngine(id)
    } else {
      await setDefaultModelEngine(undefined)
    }
  })
  ;(async () => {
    renderDefaultEngineOptions(
      $defaultEngineOpt,
      await getDefaultModelEngine(),
      await IPCBackgroundMessager.request(kGetSupportedGpuEngines) as Array<AICapabilityGpuEngine>
    )
  })()

  // model update frequency
  const $modelUpdateFreqOpt = document.getElementById('opt-model-update-freq') as HTMLSelectElement
  $modelUpdateFreqOpt.addEventListener('change', async () => {
    const id = (($modelUpdateFreqOpt as HTMLSelectElement).value as ModelUpdatePeriod)
    await setModelUpdatePeriod(id)
  })
  ;(async () => {
    const period = await getModelUpdatePeriod()
    for (const $opt of $modelUpdateFreqOpt.querySelectorAll('option')) {
      $opt.selected = $opt.value === period
    }
  })()
}

/* **************************************************************************/
// MARK: Installed models
/* **************************************************************************/

/**
 * Renders the installed models
 */
async function renderInstalledModels () {
  const models = await IPCBackgroundMessager.request(kGetInstalledModels, { stats: true }) as Array<{ manifest: AIModelManifest, stats: AIModelStats }>

  UI.empty('#installed-models')
  if (models.length) {
    for (const model of models) {
      UI.render('#t-installed-model', {
        into: '#installed-models',
        text: {
          name: model.manifest.name,
          filesize: `${filesize(getModelSize(model.manifest))}`,
          usedTS: model.stats.usedTS ? new Date(model.stats.usedTS).toLocaleString() : 'Never'
        },
        click: {
          delete: async () => {
            if (confirm(`Are you sure you want to remove ${model.manifest.name}?`)) {
              await IPCBackgroundMessager.request(kUninstallModel, { model: model.manifest.id })
              await renderInstalledModels()
            }
          }
        }
      })
    }
  } else {
    UI.render('#t-no-installed-model', { into: '#installed-models' })
  }
}

/* **************************************************************************/
// MARK: Permissions
/* **************************************************************************/

async function renderPermissions () {
  const permissions = await getAllSitePermissionsGroupedByOrigin()

  UI.empty('#site-permissions')
  if (permissions.length === 0) {
    UI.render('#t-no-permissions', { into: '#site-permissions' })
  } else {
    for (const permission of permissions) {
      UI.render('#t-site-permission', {
        into: '#site-permissions',
        text: { origin: permission.origin },
        render: {
          models: () => {
            return permission.models.map((model) => {
              const template = model.permission ? '#t-site-model-permission-granted' : '#t-site-model-permission-denied'
              return UI.render(template, {
                text: { model: model.modelId },
                click: {
                  delete: async () => {
                    await setSiteModelPermission(model.origin, model.modelId, undefined)
                    await renderPermissions()
                  }
                }
              })
            })
          }
        }
      })
    }
  }
}

/* **************************************************************************/
// MARK: Versions
/* **************************************************************************/

async function renderVersionInfo () {
  document.getElementById('extension-version').textContent = chrome.runtime.getManifest().version

  const $binaryVersion = document.getElementById('binary-version')
  const info = await IPCBackgroundMessager.request(kGetInfo) as { binaryVersion: string }
  $binaryVersion.textContent = info.binaryVersion

  const $binaryUpdate = document.getElementById('binary-update')
  $binaryUpdate.addEventListener('click', async (evt) => {
    evt.preventDefault()
    $binaryUpdate.setAttribute('disabled', 'true')

    console.log('Requesting update')
    const status = await IPCBackgroundMessager.request(kUpdateNativeBinary) as UpdateResult
    console.log(`Update status: ${status}`)
    $binaryUpdate.removeAttribute('disabled')

    switch (status) {
      case UpdateResult.Error:
      case UpdateResult.NetworkError:
      case UpdateResult.SignatureError:
        alert('Failed to check for updates')
        break
      case UpdateResult.NoUpdate:
        alert('No updates available')
        break
      case UpdateResult.Updated:
        alert('Updated!')
        chrome.runtime.reload()
        break
    }
  })
}

/* **************************************************************************/
// MARK: Main
/* **************************************************************************/

async function main () {
  renderSettings()
  renderInstalledModels()
  renderPermissions()
  renderVersionInfo()
}

main()
