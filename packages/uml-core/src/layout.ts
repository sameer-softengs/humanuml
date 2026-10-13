import type { Diagnostic } from "../../contracts/src/diagnostics.js";
import type {
  LayoutOptions,
  LayoutResult,
  LayoutSize,
  UseCaseDiagram,
  UseCaseLayout
} from "./contracts.js";

const DEFAULTS: Required<LayoutOptions> = {
  horizontalSpacing: 160,
  verticalSpacing: 90,
  nodePadding: 24,
  fontSize: 16,
  systemPadding: 50,
  minWidth: 720,
  minHeight: 480,
  maxElements: 500
};

function invalidOptions(options: LayoutOptions): Diagnostic | undefined {
  for (const [name, value] of Object.entries(options)) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
      return { code: "HU-UML-007", severity: "error", message: `Layout option ${name} must be a finite positive number.` };
    }
  }
  return undefined;
}

function textSize(label: string, fontSize: number, padding: number): LayoutSize {
  const width = Math.max(140, label.length * fontSize * 0.58 + padding * 2);
  return { width, height: Math.max(64, fontSize * 2.6 + padding) };
}

export function layoutUseCaseDiagram(
  diagram: UseCaseDiagram,
  supplied: LayoutOptions = {}
): LayoutResult {
  const optionError = invalidOptions(supplied);
  if (optionError) return { ok: false, diagnostics: [optionError] };
  const options = { ...DEFAULTS, ...supplied };
  const count = diagram.actors.length + diagram.useCases.length + diagram.associations.length;
  if (count > options.maxElements) {
    return {
      ok: false,
      diagnostics: [{ code: "HU-UML-008", severity: "error", message: `Diagram exceeds the maximum layout complexity of ${options.maxElements} elements.` }]
    };
  }

  const actorColumn = 40;
  const systemX = actorColumn + 150;
  const useCaseColumn = systemX + options.systemPadding + 150;
  const rows = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, diagram.useCases.length))));
  const useCaseLayouts = diagram.useCases.map((useCase, index) => {
    const size = textSize(useCase.label, options.fontSize, options.nodePadding);
    const row = Math.floor(index / rows);
    const column = index % rows;
    return {
      id: useCase.id,
      center: {
        x: useCaseColumn + column * options.horizontalSpacing + size.width / 2,
        y: options.systemPadding + size.height / 2 + row * options.verticalSpacing
      },
      size
    };
  });
  const maxUseCaseRight = useCaseLayouts.reduce(
    (value, node) => Math.max(value, node.center.x + node.size.width / 2),
    useCaseColumn
  );
  const systemY = 30;
  const systemWidth = Math.max(420, maxUseCaseRight - systemX + options.systemPadding);
  const systemHeight = Math.max(
    300,
    (useCaseLayouts.length === 0 ? 0 : Math.ceil(useCaseLayouts.length / rows) * options.verticalSpacing) + options.systemPadding * 2
  );
  const actorLayouts = diagram.actors.map((actor, index) => ({
    id: actor.id,
    center: {
      x: actorColumn + 50,
      y: systemY + options.systemPadding + 45 + index * options.verticalSpacing
    },
    size: { width: 100, height: 80 }
  }));
  const actorById = new Map(actorLayouts.map(actor => [actor.id, actor]));
  const useCaseById = new Map(useCaseLayouts.map(useCase => [useCase.id, useCase]));
  const associations = diagram.associations.map(association => {
    const actor = actorById.get(association.actorId)!;
    const useCase = useCaseById.get(association.useCaseId)!;
    return {
      id: association.id,
      points: [
        { x: actor.center.x + actor.size.width / 2, y: actor.center.y },
        { x: useCase.center.x - useCase.size.width / 2, y: useCase.center.y }
      ]
    };
  });
  const width = Math.max(options.minWidth, systemX + systemWidth + 40);
  const height = Math.max(options.minHeight, systemY + systemHeight + 40, actorLayouts.length * options.verticalSpacing + 120);
  const layout: UseCaseLayout = {
    diagramId: "diagram:use-case",
    width,
    height,
    system: { x: systemX, y: systemY, width: systemWidth, height: systemHeight },
    actors: actorLayouts,
    useCases: useCaseLayouts,
    associations,
    fontSize: options.fontSize
  };
  return { ok: true, layout, diagnostics: [] };
}
