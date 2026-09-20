import OpenAI from "openai";

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!_client) _client = new OpenAI({ apiKey: key });
  return _client;
}

export async function chatJSON<T>(
  systemPrompt: string,
  userPrompt: string,
  fallback: T,
  opts?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<T> {
  const client = getOpenAI();
  if (!client) return fallback;

  try {
    const res = await client.chat.completions.create({
      model: opts?.model ?? "gpt-4o",
      temperature: opts?.temperature ?? 0.3,
      max_tokens: opts?.maxTokens ?? 4096,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const text = res.choices[0]?.message?.content;
    if (!text) return fallback;
    return JSON.parse(text) as T;
  } catch (err) {
    console.warn("[LLM] chatJSON failed, using fallback:", err);
    return fallback;
  }
}

export async function chatText(
  systemPrompt: string,
  userPrompt: string,
  fallback: string,
  opts?: { model?: string; temperature?: number; maxTokens?: number }
): Promise<string> {
  const client = getOpenAI();
  if (!client) return fallback;

  try {
    const res = await client.chat.completions.create({
      model: opts?.model ?? "gpt-4o",
      temperature: opts?.temperature ?? 0.5,
      max_tokens: opts?.maxTokens ?? 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    return res.choices[0]?.message?.content?.trim() ?? fallback;
  } catch (err) {
    console.warn("[LLM] chatText failed, using fallback:", err);
    return fallback;
  }
}
