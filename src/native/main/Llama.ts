export async function importLlama () {
  return import(/* webpackIgnore: true */ 'node-llama-cpp')
}
