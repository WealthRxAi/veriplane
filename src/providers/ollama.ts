import type {
  GenerateRequest,
  GenerateResponse,
  ModelProvider,
} from "./types.js";

export class OllamaProvider implements ModelProvider {
  readonly id = "ollama";
  readonly label = "Ollama (local)";
  constructor(
    private readonly baseUrl = process.env.OLLAMA_BASE_URL ??
      "http://127.0.0.1:11434",
    private readonly defaultModel = "llama3.2",
  ) {}

  async available(): Promise<boolean> {
    try {
      return (
        await fetch(`${this.baseUrl}/api/tags`, {
          signal: AbortSignal.timeout(600),
        })
      ).ok;
    } catch {
      return false;
    }
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const model = request.model ?? this.defaultModel;
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages: request.messages,
        stream: false,
        options: { temperature: request.temperature ?? 0.2 },
      }),
    });
    if (!response.ok)
      throw new Error(
        `Ollama returned ${response.status}: ${await response.text()}`,
      );
    const data = (await response.json()) as {
      message?: { content?: string };
      done_reason?: string;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    return {
      provider: this.id,
      model,
      content: data.message?.content ?? "",
      finishReason: data.done_reason,
      usage: {
        inputTokens: data.prompt_eval_count,
        outputTokens: data.eval_count,
      },
    };
  }
}
