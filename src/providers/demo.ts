import type {
  GenerateRequest,
  GenerateResponse,
  ModelProvider,
} from "./types.js";

export class DemoProvider implements ModelProvider {
  readonly id = "demo";
  readonly label = "Demo (no API key)";
  async available(): Promise<boolean> {
    return true;
  }
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const context =
      request.messages.find((item) => item.role === "system")?.content ?? "";
    const progress =
      context.match(/PROJECT PROGRESS: (\d+)%/)?.[1] ?? "unknown";
    const blocker = context.match(/BLOCKERS: (.+)/)?.[1] ?? "none observed";
    return {
      provider: this.id,
      model: "evidence-summary-v1",
      content: `This project is ${progress}% verified. Current blocker: ${blocker}. I would work the first unverified dependency next, then ingest machine evidence before changing its status.`,
      finishReason: "deterministic",
    };
  }
}
