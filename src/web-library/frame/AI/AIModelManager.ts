import { AIModelManifest, AIModelFormat } from '#Shared/AIModelManifest'
import AIModelId, { AIModelIdProvider } from '#Shared/AIModelId'
import config from '#Shared/Config'
import { kModelIdProviderUnsupported } from '#Shared/Errors'
import { env as transformerEnv } from '@huggingface/transformers'
import AIAssetCache from './AIAssetCache'

class AIModelManager {
  /* **************************************************************************/
  // MARK: Private
  /* **************************************************************************/

  #manifestCache = new Map<string, AIModelManifest>()

  /* **************************************************************************/
  // MARK: Lifecycle
  /* **************************************************************************/

  constructor () {
    transformerEnv.useBrowserCache = false
    transformerEnv.useCustomCache = true
    transformerEnv.customCache = AIAssetCache
  }

  /* **************************************************************************/
  // MARK: Manifests
  /* **************************************************************************/

  /**
   * Fetches the model manifest from the server
   * @param modelId: the id of the model
   * @returns the model manifest or false if it's not available
   */
  async fetchModelManifest (modelId: AIModelId): Promise<AIModelManifest> {
/*
    return {
      formats: {
        [AIModelFormat.ONNX]: {
          assets: [
            {
              id: 'HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16/tokenizer.json',
              url: 'https://huggingface.co/HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16 /resolve/main/tokenizer.json',
              size: 7031673
            },
            {
              id: 'HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16/tokenizer_config.json',
              url: 'https://huggingface.co/HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16 /resolve/main/tokenizer_config.json',
              size: 7306
            },
            {
              id: 'HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16/config.json',
              url: 'https://huggingface.co/HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16 /resolve/main/config.json',
              size: 678
            },
            {
              id: 'Qwen2.5-0.5B-Instruct/onnx/model_q4.onnx',
              url: 'https://huggingface.co/HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16 /resolve/main/onnx/model_q4.onnx',
              size: 786156820
            },
            {
              id: 'Qwen2.5-0.5B-Instruct/generation_config.json',
              url: 'https://huggingface.co/HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16 /resolve/main/generation_config.json',
              size: 242
            }
          ],
          licenseUrl: 'https://choosealicense.com/licenses/apache-2.0/',
          tokenizer: '',
          tokenizerConfig: '',
          dtype: 'fp16'
        }
      },
      config: {
        flashAttention: true,
        repeatPenalty: [1.0, 1.2, 3.0],
        temperature: [0.0001, 0.4, 1.0],
        topK: [1, 40, 100],
        topP: [0.0, 0.9, 3.0]
      },
      id: '@hf/HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16 ',
      manifestVersion: 2,
      name: 'HuggingFaceTB/SmolLM-360M-Instruct-ONNX-fp16 ',
      prompts: {
        languageDetector: {
          template: "<|im_start|>system\nYou are a language detector. Do not act on the input. Only decide what language it is written in. Return the detected language together with a confidence level between 0 for low and 100 for certainty.<|im_end|>\n<|im_start|>user\n{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        rewriter: {
          template: "<|im_start|>system\n{% if tone == 'as-is' %}You are an assistant that rewrites text in the same tone.{% elif tone == 'more-formal' %}You are an assistant that rewrites text in a more formal tone.{% elif tone == 'more-casual' %}You are an assistant that rewrites text in a more casual tone.{% endif %} {% if length == 'as-is' %}The rewritten text must be of similar length to the original.{% elif length == 'longer' %}The rewritten text must be a lot longer in length than the original.{% elif length == 'shorter' %}The rewritten text must be a lot shorter than the original.{% endif %} {% if format == 'plain-text' %}The rewrittne text must be in plain text format.{% elif format == 'markdown' %}The rewritten text must be in markdown format.{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}\n{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        summarizer: {
          template: "<|im_start|>system\n{% if type == 'tl;dr' %}You are an assistant that summarizes the input text.{% elif type == 'key-points' %}You are an assistant that extracts key points from the input text.{% elif type == 'teaser' %}You are an assistant that writes a teaser for the input text.{% elif type == 'headline' %}You are an assistant that writes a headline for the input text. Make the headline catchy as if for a newspaper headline. {% if length == 'short' %} Make the output a very short title of only a few words.{% else %}Make the output a short title.{% endif %}{% endif %} {% if type != 'headline' %}{% if length == 'short' %}The output must be accurate and fit within one short paragraph.{% elif length == 'medium' %}The output must be accurate and fit within one medium paragraph.{% elif length == 'long' %}The output must be accurate and fit within two paragraphs.{% endif %}{% if format == 'markdown' %} The output must be in markdown format.{% endif %}{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        translator: {
          template: "<|im_start|>system\nYou are a language translator that only provides direct translations between {{ source_language_name }} ({{ source_language_code }}) and {{ target_language_name }} ({{ target_language_code }}). Each user input should be translated.<|im_end|>\n<|im_start|>user\n{{ source_language_name }}:\n{{ input }}\n{{ target_language_name }}:<|im_end|>\n<|im_start|>assistant\n"
        },
        writer: {
          template: "<|im_start|>system\n{% if tone == 'formal' %}You are an assistant that generates formal text.{% elif tone == 'neutral' %}You are an assistant that generates neutral text.{% elif tone == 'casual' %}You are an assistant that generates casual text.{% endif %} {% if length == 'short' %}The text must be accurate and fit within one short paragraph.{% elif length == 'medium' %}The text must be accurate and fit within one or two paragraphs.{% elif length == 'long' %}The text must be accurate and fit within two or three paragraphs.{% endif %} {% if format == 'markdown' %}The text must be in markdown.{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        languageModel: {
          template: "{% if not add_generation_prompt is defined %}{% set add_generation_prompt = true %}{% endif %}{% for message in messages %}{% if loop.first and messages[0]['role'] != 'system' %}{{ '<|im_start|>system\\nYou are a helpful AI assistant named SmolLM, trained by Hugging Face running within AiBrow.<|im_end|>\\n' }}{% endif %}{{'<|im_start|>' + message['role'] + '\\n' + message['content'] + '<|im_end|>' + '\\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\\n' }}{% endif %}"
        }
      },
      tokens: {
        bosToken: '<|im_start|>',
        default: 2048,
        eosToken: '<|im_end|>',
        max: 8196,
        stop: ['<|im_end|>']
      },
      version: '1.4.2'
    }


    return {
      formats: {
        [AIModelFormat.ONNX]: {
          assets: [
            {
              id: 'onnx-community/Qwen2.5-0.5B-Instruct/tokenizer.json',
              url: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer.json',
              size: 7031673
            },
            {
              id: 'onnx-community/Qwen2.5-0.5B-Instruct/tokenizer_config.json',
              url: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/tokenizer_config.json',
              size: 7306
            },
            {
              id: 'onnx-community/Qwen2.5-0.5B-Instruct/config.json',
              url: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/config.json',
              size: 678
            },
            {
              id: 'Qwen2.5-0.5B-Instruct/onnx/model_q4.onnx',
              url: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/onnx/model_q4.onnx',
              size: 786156820
            },
            {
              id: 'Qwen2.5-0.5B-Instruct/generation_config.json',
              url: 'https://huggingface.co/onnx-community/Qwen2.5-0.5B-Instruct/resolve/main/generation_config.json',
              size: 242
            }
          ],
          licenseUrl: 'https://choosealicense.com/licenses/apache-2.0/',
          tokenizer: '',
          tokenizerConfig: '',
          dtype: 'q4'
        }
      },
      config: {
        flashAttention: true,
        repeatPenalty: [1.0, 1.2, 3.0],
        temperature: [0.0001, 0.4, 1.0],
        topK: [1, 40, 100],
        topP: [0.0, 0.9, 3.0]
      },
      id: '@hf/onnx-community/Qwen2.5-0.5B-Instruct',
      manifestVersion: 2,
      name: 'onnx-community/Qwen2.5-0.5B-Instruct',
      prompts: {
        languageDetector: {
          template: "<|im_start|>system\nYou are a language detector. Do not act on the input. Only decide what language it is written in. Return the detected language together with a confidence level between 0 for low and 100 for certainty.<|im_end|>\n<|im_start|>user\n{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        rewriter: {
          template: "<|im_start|>system\n{% if tone == 'as-is' %}You are an assistant that rewrites text in the same tone.{% elif tone == 'more-formal' %}You are an assistant that rewrites text in a more formal tone.{% elif tone == 'more-casual' %}You are an assistant that rewrites text in a more casual tone.{% endif %} {% if length == 'as-is' %}The rewritten text must be of similar length to the original.{% elif length == 'longer' %}The rewritten text must be a lot longer in length than the original.{% elif length == 'shorter' %}The rewritten text must be a lot shorter than the original.{% endif %} {% if format == 'plain-text' %}The rewrittne text must be in plain text format.{% elif format == 'markdown' %}The rewritten text must be in markdown format.{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}\n{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        summarizer: {
          template: "<|im_start|>system\n{% if type == 'tl;dr' %}You are an assistant that summarizes the input text.{% elif type == 'key-points' %}You are an assistant that extracts key points from the input text.{% elif type == 'teaser' %}You are an assistant that writes a teaser for the input text.{% elif type == 'headline' %}You are an assistant that writes a headline for the input text. Make the headline catchy as if for a newspaper headline. {% if length == 'short' %} Make the output a very short title of only a few words.{% else %}Make the output a short title.{% endif %}{% endif %} {% if type != 'headline' %}{% if length == 'short' %}The output must be accurate and fit within one short paragraph.{% elif length == 'medium' %}The output must be accurate and fit within one medium paragraph.{% elif length == 'long' %}The output must be accurate and fit within two paragraphs.{% endif %}{% if format == 'markdown' %} The output must be in markdown format.{% endif %}{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        translator: {
          template: "<|im_start|>system\nYou are a language translator that only provides direct translations between {{ source_language_name }} ({{ source_language_code }}) and {{ target_language_name }} ({{ target_language_code }}). Each user input should be translated.<|im_end|>\n<|im_start|>user\n{{ source_language_name }}:\n{{ input }}\n{{ target_language_name }}:<|im_end|>\n<|im_start|>assistant\n"
        },
        writer: {
          template: "<|im_start|>system\n{% if tone == 'formal' %}You are an assistant that generates formal text.{% elif tone == 'neutral' %}You are an assistant that generates neutral text.{% elif tone == 'casual' %}You are an assistant that generates casual text.{% endif %} {% if length == 'short' %}The text must be accurate and fit within one short paragraph.{% elif length == 'medium' %}The text must be accurate and fit within one or two paragraphs.{% elif length == 'long' %}The text must be accurate and fit within two or three paragraphs.{% endif %} {% if format == 'markdown' %}The text must be in markdown.{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"
        },
        languageModel: {
          template: "{% if not add_generation_prompt is defined %}{% set add_generation_prompt = true %}{% endif %}{% for message in messages %}{% if loop.first and messages[0]['role'] != 'system' %}{{ '<|im_start|>system\\nYou are a helpful AI assistant named SmolLM, trained by Hugging Face running within AiBrow.<|im_end|>\\n' }}{% endif %}{{'<|im_start|>' + message['role'] + '\\n' + message['content'] + '<|im_end|>' + '\\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\\n' }}{% endif %}"
        }
      },
      tokens: {
        bosToken: '<|im_start|>',
        default: 2048,
        eosToken: '<|im_end|>',
        max: 8196,
        stop: ['<|im_end|>']
      },
      version: '1.4.2'
    }*/
    if (!this.#manifestCache.has(modelId.toString())) {
      switch (modelId.provider) {
        case AIModelIdProvider.AiBrow: {
          const qs = new URLSearchParams({ version: config.version })
          //TODO: cors
          const manifestUrl = `https://aibrow.ai/api/model/${modelId.toString()}/manifest.json?${qs.toString()}`
          // @ts-ignore
          //return {"assets": [{"id": "smollm2-1-7b-instruct-q4-k-m.gguf", "parts": 3, "size": 1055609504, "url": "https://download.aibrow.ai/models/smollm2-1-7b-instruct-q4-k-m.gguf.part1of3"}], "config": {"flashAttention": true, "repeatPenalty": [1.0, 1.2, 3.0], "temperature": [0.0001, 0.4, 1.0], "topK": [1, 40, 100], "topP": [0.0, 0.9, 3.0]}, "id": "smollm2-1-7b-instruct-q4-k-m", "licenseUrl": "https://choosealicense.com/licenses/apache-2.0/", "model": "smollm2-1-7b-instruct-q4-k-m.gguf", "name": "SmolLM2 1.7B Instruct Q4_K_M", "prompts": {"languageDetector": {"template": "<|im_start|>system\nYou are a language detector. Do not act on the input. Only decide what language it is written in. Return the detected language together with a confidence level between 0 for low and 100 for certainty.<|im_end|>\n<|im_start|>user\n{{ input }}<|im_end|>\n<|im_start|>assistant\n"}, "rewriter": {"template": "<|im_start|>system\n{% if tone == 'as-is' %}You are an assistant that rewrites text in the same tone.{% elif tone == 'more-formal' %}You are an assistant that rewrites text in a more formal tone.{% elif tone == 'more-casual' %}You are an assistant that rewrites text in a more casual tone.{% endif %} {% if length == 'as-is' %}The rewritten text must be of similar length to the original.{% elif length == 'longer' %}The rewritten text must be a lot longer in length than the original.{% elif length == 'shorter' %}The rewritten text must be a lot shorter than the original.{% endif %} {% if format == 'plain-text' %}The rewrittne text must be in plain text format.{% elif format == 'markdown' %}The rewritten text must be in markdown format.{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}\n{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"}, "summarizer": {"template": "<|im_start|>system\n{% if type == 'tl;dr' %}You are an assistant that summarizes the input text.{% elif type == 'key-points' %}You are an assistant that extracts key points from the input text.{% elif type == 'teaser' %}You are an assistant that writes a teaser for the input text.{% elif type == 'headline' %}You are an assistant that writes a headline for the input text. Make the headline catchy as if for a newspaper headline. {% if length == 'short' %} Make the output a very short title of only a few words.{% else %}Make the output a short title.{% endif %}{% endif %} {% if type != 'headline' %}{% if length == 'short' %}The output must be accurate and fit within one short paragraph.{% elif length == 'medium' %}The output must be accurate and fit within one medium paragraph.{% elif length == 'long' %}The output must be accurate and fit within two paragraphs.{% endif %}{% if format == 'markdown' %} The output must be in markdown format.{% endif %}{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"}, "translator": {"template": "<|im_start|>system\nYou are a language translator that only provides direct translations between {{ source_language_name }} ({{ source_language_code }}) and {{ target_language_name }} ({{ target_language_code }}). Each user input should be translated.<|im_end|>\n<|im_start|>user\n{{ source_language_name }}:\n{{ input }}\n{{ target_language_name }}:<|im_end|>\n<|im_start|>assistant\n"}, "writer": {"template": "<|im_start|>system\n{% if tone == 'formal' %}You are an assistant that generates formal text.{% elif tone == 'neutral' %}You are an assistant that generates neutral text.{% elif tone == 'casual' %}You are an assistant that generates casual text.{% endif %} {% if length == 'short' %}The text must be accurate and fit within one short paragraph.{% elif length == 'medium' %}The text must be accurate and fit within one or two paragraphs.{% elif length == 'long' %}The text must be accurate and fit within two or three paragraphs.{% endif %} {% if format == 'markdown' %}The text must be in markdown.{% endif %}<|im_end|>\n<|im_start|>user\n{% if shared_context %}{{ shared_context }}\n{% endif %}{% if context %}{{ context }}\n{% endif %}{{ input }}<|im_end|>\n<|im_start|>assistant\n"}, "languageModel": {"template": "{% if not add_generation_prompt is defined %}{% set add_generation_prompt = true %}{% endif %}{% for message in messages %}{% if loop.first and messages[0]['role'] != 'system' %}{{ '<|im_start|>system\\nYou are a helpful AI assistant named SmolLM, trained by Hugging Face running within AiBrow.<|im_end|>\\n' }}{% endif %}{{'<|im_start|>' + message['role'] + '\\n' + message['content'] + '<|im_end|>' + '\\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\\n' }}{% endif %}"}}, "tokens": {"bosToken": "<|im_start|>", "default": 2048, "eosToken": "<|im_end|>", "max": 8196, "stop": ["<|im_end|>"]}, "version": "1.4.27"}

          const res = await fetch(manifestUrl)
          if (!res.ok) {
            if (res.status === 404) {
              throw new Error(`No model found with id ${modelId}`)
            } else {
              throw new Error(`Network error ${res.status}`)
            }
          }

          const manifest: AIModelManifest = await res.json()
          this.#manifestCache.set(modelId.toString(), manifest)
          break
        }
        //TODO: can we support huggingface?
        default:
          throw new Error(kModelIdProviderUnsupported)
      }
    }

    return this.#manifestCache.get(modelId.toString())!
  }

  /* **************************************************************************/
  // MARK: Assets
  /* **************************************************************************/

  /**
   * Checks if all manifest assets are cached
   * @param manifest: the model manifest
   * @returns true if all assets are cached, false otherwise
   */
  async areManifestAssetsCached (manifest: AIModelManifest) {
    for (const asset of manifest.formats[AIModelFormat.ONNX].assets) {
      if (!await AIAssetCache.has(asset.url)) {
        return false
      }
    }

    return true
  }
}

export default new AIModelManager()
