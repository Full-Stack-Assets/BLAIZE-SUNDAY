import type {
  SongProject,
  SongVersion,
  ApprovalItem,
  SectionId,
  AgentRun,
  ApprovalStatus,
  ReleaseStage,
} from "./types";
import { SECTION_ORDER } from "./types";

const STORAGE_KEY = "songforge.v1";

function emptyLyrics(): Record<SectionId, string> {
  return SECTION_ORDER.reduce((acc, s) => {
    acc[s.id] = "";
    return acc;
  }, {} as Record<SectionId, string>);
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

interface Store {
  projects: SongProject[];
  approvals: ApprovalItem[];
  agentRuns: AgentRun[];
}

function readStore(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return seed();
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function seed(): Store {
  const lyrics = emptyLyrics();
  lyrics.intro = "soft static under the streetlight";
  lyrics.verse1 =
    "mirror talkin' back like it got opinions\nchain still heavy, pockets full of friction";
  lyrics.chorus = "I look expensive\neven when the night is cheap";

  const project: SongProject = {
    id: "proj_looks",
    title: "LOOKS EXPENSIVE",
    status: "IN_PROGRESS",
    role: "Manifesto single",
    progress: 42,
    lastTouched: new Date().toISOString(),
    lyrics,
    notes: "",
    versions: [],
    currentVersionId: null,
    releaseStage: "PREPARED",
  };

  const approvals: ApprovalItem[] = [
    {
      id: "appr_1",
      type: "SECTION",
      title: "Chorus lock",
      projectId: project.id,
      projectTitle: project.title,
      summary: "Approve chorus take before package.",
      createdAt: new Date().toISOString(),
      status: "PENDING",
      risk: "MODERATE",
      requiredBy: "Release gate",
      payloadPreview: lyrics.chorus,
    },
  ];

  const agentRuns: AgentRun[] = [
    {
      id: "run_1",
      agentRole: "Creative Lead",
      projectId: project.id,
      projectTitle: project.title,
      action: "Draft section variants",
      status: "SUCCEEDED",
      startedAt: new Date(Date.now() - 3600000).toISOString(),
      finishedAt: new Date(Date.now() - 3500000).toISOString(),
      summary: "Local forge produced two chorus takes.",
      risk: "LOW",
      requiresApproval: false,
    },
  ];

  return { projects: [project], approvals, agentRuns };
}

export function getProjects(): SongProject[] {
  return readStore().projects;
}

export function getProject(id: string): SongProject | null {
  return readStore().projects.find((p) => p.id === id) ?? null;
}

export function saveProject(project: SongProject): SongProject {
  const store = readStore();
  const idx = store.projects.findIndex((p) => p.id === project.id);
  const next = { ...project, lastTouched: new Date().toISOString() };
  if (idx >= 0) store.projects[idx] = next;
  else store.projects.unshift(next);
  writeStore(store);
  return next;
}

export function createProject(title: string, role: string): SongProject {
  const project: SongProject = {
    id: uid("proj"),
    title,
    status: "DRAFT",
    role: role || "Single",
    progress: 5,
    lastTouched: new Date().toISOString(),
    lyrics: emptyLyrics(),
    notes: "",
    versions: [],
    currentVersionId: null,
    releaseStage: null,
  };
  return saveProject(project);
}

export function getApprovals(): ApprovalItem[] {
  return readStore().approvals;
}

export function updateApproval(
  id: string,
  status: ApprovalStatus
): ApprovalItem[] {
  const store = readStore();
  store.approvals = store.approvals.map((a) =>
    a.id === id ? { ...a, status } : a
  );
  writeStore(store);
  return store.approvals;
}

export function applyApprovalToProject(item: ApprovalItem) {
  const store = readStore();
  const project = store.projects.find((p) => p.id === item.projectId);
  if (!project) return;
  if (!project.releaseStage) project.releaseStage = "PREPARED";
  if (project.releaseStage === "PREPARED") {
    project.releaseStage = "AWAITING_AUTHORIZATION";
  }
  project.status = "REVIEW";
  project.progress = Math.max(project.progress, 70);
  writeStore(store);
}

export function getAgentRuns(): AgentRun[] {
  return readStore().agentRuns;
}

export function resetLocalState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("songforge.llmKey");
  writeStore(seed());
}

export function saveVersion(
  projectId: string,
  label: string,
  lyrics: Record<SectionId, string>,
  notes: string,
  source: SongVersion["source"]
): SongProject | null {
  const store = readStore();
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return null;
  const version: SongVersion = {
    id: uid("ver"),
    createdAt: new Date().toISOString(),
    label,
    lyrics: { ...lyrics },
    notes,
    source,
  };
  project.versions = [version, ...project.versions].slice(0, 30);
  project.currentVersionId = version.id;
  project.lyrics = { ...lyrics };
  project.lastTouched = new Date().toISOString();
  writeStore(store);
  return project;
}
