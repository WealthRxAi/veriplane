import type {
  GenerateRequest,
  GenerateResponse,
  ModelProvider,
} from "./types.js";

export class AnthropicProvider implements ModelProvider {
  readonly id = "anthropic";
  readonly label = "Anthropic";
  constructor(
    private readonly apiKey = process.env.ANTHROPIC_API_KEY,
    private readonly defaultModel = "claude-sonnet-4-20250514",
  ) {}

  async available(): Promise<boolean> {
    return Boolean(this.apiKey);
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    if (!this.apiKey) throw new Error("Anthropic is not configured");
    const model = request.model ?? this.defaultModel;
    const system = request.messages
      .filter((item) => item.role === "system")
      .map((item) => item.content)
      .join("\n\n");
    const messages = request.messages.filter((item) => item.role !== "system");
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        system,
        messages,
        max_tokens: request.maxTokens ?? 900,
        temperature: request.temperature ?? 0.2,
      }),
    });
    if (!response.ok)
      throw new Error(
        `Anthropic returned ${response.status}: ${await response.text()}`,
      );
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      stop_reason?: string;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    return {
      provider: this.id,
      model,
      content:
        data.content
          ?.filter((part) => part.type === "text")
          .map((part) => part.text ?? "")
          .join("\n") ?? "",
      ...(data.stop_reason ? { finishReason: data.stop_reason } : {}),
      usage: {
        inputTokens: data.usage?.input_tokens,
        outputTokens: data.usage?.output_tokens,
      },
    };
  }
}
