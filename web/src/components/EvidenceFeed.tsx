import type { Evidence, ProjectNode } from "../types";
import { CheckIcon } from "./Icons";

function relative(value: string): string {
  const hours = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 3_600_000),
  );
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function EvidenceFeed({
  evidence,
  nodes,
}: {
  evidence: Evidence[];
  nodes: ProjectNode[];
}) {
  const names = new Map(nodes.map((node) => [node.id, node.title]));
  return (
    <div className="evidence-list">
      {evidence.slice(0, 6).map((item) => (
        <article className="evidence-row" key={item.id}>
          <span className="evidence-check">
            <CheckIcon size={14} />
          </span>
          <div>
            <p>{item.summary}</p>
            <span>
              {names.get(item.nodeId)} · {item.source}
            </span>
          </div>
          <time dateTime={item.observedAt}>{relative(item.observedAt)}</time>
        </article>
      ))}
    </div>
  );
}
