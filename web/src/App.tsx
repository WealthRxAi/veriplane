import { useEffect, useState } from "react";
import { api } from "./api";
import type { Connector, ProjectDetail, Provider, Summary } from "./types";
import { Copilot } from "./components/Copilot";
import { EvidenceFeed } from "./components/EvidenceFeed";
import {
  GridIcon,
  NodesIcon,
  PlugIcon,
  PulseIcon,
  SettingsIcon,
} from "./components/Icons";
import { ProgressRing } from "./components/ProgressRing";
import { ProjectCard } from "./components/ProjectCard";
import { ProjectGraph } from "./components/ProjectGraph";

const nav = [
  { label: "Overview", icon: GridIcon },
  { label: "Activity", icon: PulseIcon },
  { label: "Graph", icon: NodesIcon },
  { label: "Connectors", icon: PlugIcon },
];

export default function App() {
  const [projects, setProjects] = useState<Summary[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [selected, setSelected] = useState("");
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    api
      .bootstrap()
      .then(([projectData, providerData, connectorData]) => {
        if (!current) return;
        setProjects(projectData.projects);
        setProviders(providerData.providers);
        setConnectors(connectorData.connectors);
        setSelected(projectData.projects[0]?.id ?? "");
      })
      .catch(
        (reason: unknown) =>
          current &&
          setError(
            reason instanceof Error
              ? reason.message
              : "Could not load Veriplane",
          ),
      );
    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    let current = true;
    api
      .project(selected)
      .then((value) => current && setDetail(value))
      .catch(
        (reason: unknown) =>
          current &&
          setError(
            reason instanceof Error ? reason.message : "Could not load project",
          ),
      );
    return () => {
      current = false;
    };
  }, [selected]);

  const tasks = detail?.nodes.filter((node) => node.kind === "task") ?? [];
  const inFlight = tasks.filter((node) => node.status === "in_progress").length;
  const waiting = tasks.filter((node) => node.status === "unverified").length;
  const configuredConnectors = connectors.filter(
    (connector) => connector.configured || connector.mode === "local",
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/mark.svg" alt="" />
          <span>Veriplane</span>
          <em>alpha</em>
        </div>
        <nav aria-label="Primary navigation">
          {nav.map(({ label, icon: Icon }, index) => (
            <button className={index === 0 ? "nav-active" : ""} key={label}>
              <Icon />
              <span>{label}</span>
              {label === "Activity" ? <i>12</i> : null}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="local-state">
            <span className="live-dot" />
            <div>
              <strong>Local engine</strong>
              <span>Evidence stream live</span>
            </div>
          </div>
          <button>
            <SettingsIcon />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <span className="eyebrow">Project control plane</span>
            <h1>
              Good morning.
              <br />
              <span>Here’s what’s actually true.</span>
            </h1>
          </div>
          <div className="topbar-actions">
            <span className="sync-chip">
              <i />
              All sources checked
            </span>
            <button className="avatar" aria-label="Open profile">
              SA
            </button>
          </div>
        </header>

        {error ? (
          <div className="error-banner" role="alert">
            {error}
          </div>
        ) : null}

        <section className="project-strip" aria-label="Projects">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              active={selected === project.id}
              onSelect={() => setSelected(project.id)}
            />
          ))}
          <button className="new-project">
            <span>+</span>
            <strong>New project</strong>
            <small>Define the evidence first</small>
          </button>
        </section>

        {detail ? (
          <div className="dashboard-grid">
            <section className="hero-shell panel-shell">
              <div className="hero-panel panel-core">
                <div className="hero-copy">
                  <span className="section-label">
                    <i /> Active control plane
                  </span>
                  <h2>{detail.project.name}</h2>
                  <p>{detail.project.objective}</p>
                  <div className="next-action">
                    <span>Next verified action</span>
                    <strong>
                      {detail.summary.nextAction ?? "Project complete"}
                    </strong>
                  </div>
                </div>
                <ProgressRing value={detail.summary.progress} />
              </div>
            </section>

            <section className="metrics panel-shell">
              <div className="panel-core metric-grid">
                <div>
                  <span>Verified</span>
                  <strong>
                    {detail.summary.verifiedTasks}
                    <small>/{detail.summary.totalTasks}</small>
                  </strong>
                  <em>machine-backed</em>
                </div>
                <div>
                  <span>In motion</span>
                  <strong>{inFlight}</strong>
                  <em>partial evidence</em>
                </div>
                <div>
                  <span>Blocked</span>
                  <strong
                    className={detail.summary.blockedTasks ? "danger" : ""}
                  >
                    {detail.summary.blockedTasks}
                  </strong>
                  <em>needs attention</em>
                </div>
                <div>
                  <span>Waiting</span>
                  <strong>{waiting}</strong>
                  <em>no receipts yet</em>
                </div>
              </div>
            </section>

            <section className="graph-panel panel-shell">
              <div className="panel-core">
                <div className="panel-heading">
                  <div>
                    <span className="section-label">Execution graph</span>
                    <h2>State of work</h2>
                  </div>
                  <span className="truth-chip">
                    {detail.evidence.length} receipts
                  </span>
                </div>
                <ProjectGraph
                  nodes={detail.nodes}
                  edges={detail.edges}
                  evidence={detail.evidence}
                />
              </div>
            </section>

            <aside className="evidence-panel panel-shell">
              <div className="panel-core">
                <div className="panel-heading">
                  <div>
                    <span className="section-label">Evidence stream</span>
                    <h2>Receipts, not updates</h2>
                  </div>
                  <span className="live-dot" />
                </div>
                <EvidenceFeed evidence={detail.evidence} nodes={detail.nodes} />
                <div className="source-foot">
                  <span>
                    {configuredConnectors}/{connectors.length} sources ready
                  </span>
                  <div>
                    {connectors.slice(0, 4).map((connector) => (
                      <i title={connector.label} key={connector.id}>
                        {connector.label.slice(0, 1)}
                      </i>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <section className="copilot-panel panel-shell">
              <div className="panel-core">
                <Copilot
                  key={detail.project.id}
                  projectId={detail.project.id}
                  providers={providers}
                  onAsk={async (prompt, provider) =>
                    (await api.chat(detail.project.id, prompt, provider))
                      .content
                  }
                />
              </div>
            </section>
          </div>
        ) : (
          <div className="loading">
            <span />
            Reconstructing project truth…
          </div>
        )}
      </main>
    </div>
  );
}
