import { useMemo } from "react";
import type { Evidence, ProjectEdge, ProjectNode } from "../types";
import { CheckIcon } from "./Icons";

const statusLabel = {
  verified: "Verified",
  in_progress: "In progress",
  blocked: "Blocked",
  unverified: "Waiting",
} as const;

export function ProjectGraph({
  nodes,
  edges,
  evidence,
}: {
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  evidence: Evidence[];
}) {
  const tasks = useMemo(() => {
    const taskNodes = nodes.filter((node) => node.kind === "task");
    const byId = new Map(taskNodes.map((node) => [node.id, node]));
    const incoming = new Map(taskNodes.map((node) => [node.id, 0]));
    const outgoing = new Map(
      taskNodes.map((node) => [node.id, [] as string[]]),
    );
    for (const edge of edges) {
      if (
        edge.relation !== "depends_on" ||
        !byId.has(edge.from) ||
        !byId.has(edge.to)
      )
        continue;
      outgoing.get(edge.from)!.push(edge.to);
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    }
    const queue = taskNodes.filter((node) => incoming.get(node.id) === 0);
    const ordered: ProjectNode[] = [];
    while (queue.length) {
      const current = queue.shift()!;
      ordered.push(current);
      for (const child of outgoing.get(current.id) ?? []) {
        incoming.set(child, (incoming.get(child) ?? 1) - 1);
        if (incoming.get(child) === 0) queue.push(byId.get(child)!);
      }
    }
    return ordered.length === taskNodes.length ? ordered : taskNodes;
  }, [edges, nodes]);
  const dependencies = useMemo(
    () =>
      new Map(
        edges
          .filter((edge) => edge.relation === "depends_on")
          .map((edge) => [
            edge.to,
            nodes.find((node) => node.id === edge.from)?.title ?? edge.from,
          ]),
      ),
    [edges, nodes],
  );
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of evidence)
      map.set(item.nodeId, (map.get(item.nodeId) ?? 0) + 1);
    return map;
  }, [evidence]);

  return (
    <div className="task-flow" role="list" aria-label="Project task graph">
      {tasks.map((task, index) => (
        <div className="task-step" role="listitem" key={task.id}>
          <div className="task-rail">
            <span className={`task-dot ${task.status}`}>
              {task.status === "verified" ? (
                <CheckIcon size={13} />
              ) : (
                String(index + 1).padStart(2, "0")
              )}
            </span>
            {index < tasks.length - 1 ? <span className="rail-line" /> : null}
          </div>
          <div className="task-body">
            <div className="task-heading">
              <h3>{task.title}</h3>
              <span className={`status-pill ${task.status}`}>
                {statusLabel[task.status]}
              </span>
            </div>
            <div className="task-proof">
              <span>{counts.get(task.id) ?? 0} receipts</span>
              <span>{task.criteria.length} required checks</span>
              {dependencies.has(task.id) ? (
                <span>After {dependencies.get(task.id)}</span>
              ) : null}
            </div>
            {task.blockedReason ? (
              <p className="blocked-reason">{task.blockedReason}</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
