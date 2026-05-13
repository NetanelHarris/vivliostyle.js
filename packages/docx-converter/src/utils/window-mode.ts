export type DetachablePanel = "editor" | "preview" | "sidebar";

export function isDetachedWindow(): boolean {
  return new URLSearchParams(window.location.search).has("panel");
}

export function getDetachedPanel(): DetachablePanel | null {
  const panel = new URLSearchParams(window.location.search).get("panel");
  if (panel === "editor" || panel === "preview" || panel === "sidebar") {
    return panel;
  }
  return null;
}

export function getDetachedProject(): string | null {
  return new URLSearchParams(window.location.search).get("project");
}
