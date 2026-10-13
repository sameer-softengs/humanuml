import type { Diagnostic } from "../../contracts/src/diagnostics.js";
import type { UseCaseDiagram, UseCaseLayout } from "./contracts.js";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export interface SvgResult {
  ok: boolean;
  svg?: string;
  diagnostics: Diagnostic[];
}

export function renderUseCaseSvg(
  diagram: UseCaseDiagram,
  layout: UseCaseLayout
): SvgResult {
  const actors = new Map(diagram.actors.map(actor => [actor.id, actor]));
  const useCases = new Map(diagram.useCases.map(useCase => [useCase.id, useCase]));
  const actorLayouts = new Map(layout.actors.map(actor => [actor.id, actor]));
  const useCaseLayouts = new Map(layout.useCases.map(useCase => [useCase.id, useCase]));
  const title = diagram.systemName?.trim() || "HumanUML Use Case Diagram";
  const desc = `Deterministic UML use case diagram with ${diagram.actors.length} actor(s) and ${diagram.useCases.length} use case(s).`;
  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 ${layout.width} ${layout.height}" role="img" aria-labelledby="title desc">`);
  parts.push(`<title id="title">${escapeXml(title)}</title>`);
  parts.push(`<desc id="desc">${escapeXml(desc)}</desc>`);
  parts.push("<style>text{font-family:Arial,sans-serif;fill:#172033} .boundary{fill:#f8fafc;stroke:#334155;stroke-width:2} .actor{fill:none;stroke:#172033;stroke-width:2} .usecase{fill:#fff;stroke:#172033;stroke-width:2} .association{stroke:#475569;stroke-width:1.5;fill:none} .label{font-size:16px;text-anchor:middle;dominant-baseline:middle} .system-label{font-size:18px;font-weight:600}</style>");
  parts.push(`<rect class="boundary" x="${layout.system.x}" y="${layout.system.y}" width="${layout.system.width}" height="${layout.system.height}" rx="4"/>`);
  parts.push(`<text class="system-label" x="${layout.system.x + 18}" y="${layout.system.y + 28}">${escapeXml(title)}</text>`);

  for (const association of layout.associations) {
    const points = association.points.map(point => `${point.x},${point.y}`).join(" ");
    parts.push(`<polyline class="association" points="${points}"/>`);
  }
  for (const node of layout.actors) {
    const actor = actors.get(node.id);
    if (!actor) continue;
    const x = node.center.x;
    const y = node.center.y;
    parts.push(`<g data-id="${escapeXml(node.id)}" aria-label="Actor ${escapeXml(actor.name)}">`);
    parts.push(`<circle class="actor" cx="${x}" cy="${y - 22}" r="10"/>`);
    parts.push(`<line class="actor" x1="${x}" y1="${y - 12}" x2="${x}" y2="${y + 18}"/>`);
    parts.push(`<line class="actor" x1="${x - 18}" y1="${y}" x2="${x + 18}" y2="${y}"/>`);
    parts.push(`<line class="actor" x1="${x}" y1="${y + 18}" x2="${x - 15}" y2="${y + 38}"/>`);
    parts.push(`<line class="actor" x1="${x}" y1="${y + 18}" x2="${x + 15}" y2="${y + 38}"/>`);
    parts.push(`<text class="label" x="${x}" y="${y + 58}">${escapeXml(actor.name)}</text>`);
    parts.push("</g>");
  }
  for (const node of layout.useCases) {
    const useCase = useCases.get(node.id);
    if (!useCase) continue;
    parts.push(`<g data-id="${escapeXml(node.id)}">`);
    parts.push(`<ellipse class="usecase" cx="${node.center.x}" cy="${node.center.y}" rx="${node.size.width / 2}" ry="${node.size.height / 2}"/>`);
    parts.push(`<text class="label" x="${node.center.x}" y="${node.center.y}">${escapeXml(useCase.label)}</text>`);
    parts.push("</g>");
  }
  parts.push("</svg>");
  return { ok: true, svg: parts.join("") + "\n", diagnostics: [] };
}

export { escapeXml };
