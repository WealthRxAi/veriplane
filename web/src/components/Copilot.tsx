import { useState, type FormEvent } from "react";
import type { Provider } from "../types";
import { ArrowIcon, SparkIcon } from "./Icons";

export function Copilot({
  projectId,
  providers,
  onAsk,
}: {
  projectId: string;
  providers: Provider[];
  onAsk: (prompt: string, provider: string) => Promise<string>;
}) {
  const [prompt, setPrompt] = useState("What should happen next?");
  const [provider, setProvider] = useState("auto");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const available = providers.filter((item) => item.available);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true);
    try {
      setAnswer(await onAsk(prompt, provider));
    } catch (error) {
      setAnswer(
        error instanceof Error
          ? error.message
          : "The provider could not answer.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="copilot">
      <div className="copilot-intro">
        <span className="spark">
          <SparkIcon size={17} />
        </span>
        <div>
          <strong>Ask the control plane</strong>
          <span>Answers are grounded in project state.</span>
        </div>
      </div>
      {answer ? (
        <div className="copilot-answer" aria-live="polite">
          {answer}
        </div>
      ) : null}
      <form onSubmit={submit}>
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          aria-label="Ask about this project"
          placeholder="What should happen next?"
        />
        <select
          value={provider}
          onChange={(event) => setProvider(event.target.value)}
          aria-label="Model provider"
        >
          <option value="auto">Auto</option>
          {available.map((item) => (
            <option value={item.id} key={item.id}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          aria-label="Send question"
          disabled={loading || !projectId}
        >
          <span>{loading ? "…" : <ArrowIcon size={15} />}</span>
        </button>
      </form>
    </div>
  );
}
