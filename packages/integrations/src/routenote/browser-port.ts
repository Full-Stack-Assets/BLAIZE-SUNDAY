export type RouteNoteLocatorKind =
  | "role"
  | "label"
  | "text"
  | "name"
  | "id"
  | "css";

export interface RouteNoteLocatorCandidate {
  kind: RouteNoteLocatorKind;
  value: string;
  role?: string;
}

export interface RouteNoteLocator {
  operation: string;
  candidates: RouteNoteLocatorCandidate[];
}

export interface RouteNoteBrowserPort {
  goto(url: string): Promise<void>;
  currentUrl(): Promise<string>;
  isVisible(locator: RouteNoteLocator): Promise<boolean>;
  click(locator: RouteNoteLocator): Promise<void>;
  fill(locator: RouteNoteLocator, value: string): Promise<void>;
  select(locator: RouteNoteLocator, value: string): Promise<void>;
  check(locator: RouteNoteLocator, checked: boolean): Promise<void>;
  setInputFiles(locator: RouteNoteLocator, paths: string[]): Promise<void>;
  text(locator: RouteNoteLocator): Promise<string | null>;
  allText(locator: RouteNoteLocator): Promise<string[]>;
  waitForVisible(locator: RouteNoteLocator, timeoutMs?: number): Promise<void>;
  screenshot(path: string): Promise<void>;
}
