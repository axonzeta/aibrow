export async function importLlama () {
  return import(/* webpackIgnore: true */ '@aibrow/node-llama-cpp')
}
