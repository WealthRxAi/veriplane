import type {
  GenerateRequest,
  GenerateResponse,
  ModelProvider,
} from "./types.js";

interface OpenAICompatibleOptions {
  id: string;
  label: string;
  apiKey?: string;
  baseUrl: string;
  defaultModel: string;
}

export class OpenAICompatibleProvider implements ModelProvider {
  readonly id: string;
  readonly label: string;
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;

  constructor(options: OpenAICompatibleOptions) {
    this.id = options.id;
    this.label = options.label;
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.defaultModel = options.defaultModel;
  }

  async available(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    if (!this.apiKey) throw new Error(`${this.label} is not configured`);
    const model = request.model ?? this.defaultModel;
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 900,
      }),
    });
    if (!response.ok)
      throw new Error(
        `${this.label} returned ${response.status}: ${await response.text()}`,
      );
    const data = (await response.json()) as {
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    return {
      provider: this.id,
      model,
      content: data.choices?.[0]?.message?.content ?? "",
      ...(data.choices?.[0]?.finish_reason
        ? { finishReason: data.choices[0].finish_reason }
        : {}),
      usage: {
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
      },
    };
  }
}
