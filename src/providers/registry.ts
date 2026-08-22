import { AnthropicProvider } from "./anthropic.js";
import { DemoProvider } from "./demo.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import type {
  GenerateRequest,
  GenerateResponse,
  ModelProvider,
} from "./types.js";

export class ProviderRegistry {
  private readonly providers = new Map<string, ModelProvider>();

  constructor() {
    this.register(
      new OpenAICompatibleProvider({
        id: "openai",
        label: "OpenAI",
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: "https://api.openai.com/v1",
        defaultModel: "gpt-5-mini",
      }),
    );
    this.register(new AnthropicProvider());
    this.register(
      new OpenAICompatibleProvider({
        id: "xai",
        label: "xAI / Grok",
        apiKey: process.env.XAI_API_KEY,
        baseUrl: "https://api.x.ai/v1",
        defaultModel: "grok-4-fast",
      }),
    );
    this.register(
      new OpenAICompatibleProvider({
        id: "openrouter",
        label: "OpenRouter",
        apiKey: process.env.OPENROUTER_API_KEY,
        baseUrl: "https://openrouter.ai/api/v1",
        defaultModel: "openai/gpt-5-mini",
      }),
    );
    this.register(new OllamaProvider());
    this.register(new DemoProvider());
  }

  register(provider: ModelProvider): void {
    this.providers.set(provider.id, provider);
  }

  async list(): Promise<
    Array<{ id: string; label: string; available: boolean }>
  > {
    return Promise.all(
      [...this.providers.values()].map(async (provider) => ({
        id: provider.id,
        label: provider.label,
        available: await provider.available(),
      })),
    );
  }

  async generate(
    providerId: string | undefined,
    request: GenerateRequest,
  ): Promise<GenerateResponse> {
    let provider =
      providerId && providerId !== "auto"
        ? this.providers.get(providerId)
        : undefined;
    if (!provider) {
      for (const id of [
        "ollama",
        "anthropic",
        "openai",
        "xai",
        "openrouter",
        "demo",
      ]) {
        const candidate = this.providers.get(id);
        if (candidate && (await candidate.available())) {
          provider = candidate;
          break;
        }
      }
    }
    if (!provider) throw new Error(`Unknown provider: ${providerId}`);
    if (!(await provider.available()))
      throw new Error(
        `${provider.label} is not available; configure its key first`,
      );
    return provider.generate(request);
  }
}
