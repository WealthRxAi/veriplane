export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface GenerateResponse {
  provider: string;
  model: string;
  content: string;
  finishReason?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface ModelProvider {
  id: string;
  label: string;
  available(): Promise<boolean>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}
