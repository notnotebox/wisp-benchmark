/** Ollama models the benchmark may use: OLLAMA_MODELS (comma separated), or the single OLLAMA_MODEL. */
export function configuredOllamaModels() {
  const raw = process.env.OLLAMA_MODELS || process.env.OLLAMA_MODEL || "";
  return raw.split(",").map((tag) => tag.trim()).filter(Boolean);
}
