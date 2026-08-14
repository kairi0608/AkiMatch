export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export function isAIConfigured(apiKey = process.env.OPENAI_API_KEY) {
  return Boolean(apiKey?.trim());
}

export function getOpenAIModel(model = process.env.OPENAI_MODEL) {
  return model?.trim() || DEFAULT_OPENAI_MODEL;
}
