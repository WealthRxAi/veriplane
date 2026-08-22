import type { Summary } from "../types";
import { ArrowIcon } from "./Icons";

export function ProjectCard({
  project,
  active,
  onSelect,
}: {
  project: Summary;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={`project-card ${active ? "active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className="project-card-top">
        <span>{project.name}</span>
        <span className="project-arrow">
          <ArrowIcon size={13} />
        </span>
      </span>
      <span className="project-objective">{project.objective}</span>
      <span className="project-meter">
        <span style={{ transform: `scaleX(${project.progress / 100})` }} />
      </span>
      <span className="project-meta">
        <span>{project.progress}% evidence-backed</span>
        <span>
          {project.blockedTasks
            ? `${project.blockedTasks} blocked`
            : "On track"}
        </span>
      </span>
    </button>
  );
}
