import type { HumanRequirementsModel } from "../../contracts/src/hrm.js";
import { mapUseCaseDiagram } from "./mapper.js";
import { validateUseCaseDiagram } from "./validator.js";
import { layoutUseCaseDiagram } from "./layout.js";
import { renderUseCaseSvg } from "./renderer.js";
import type {
  GeneratorOptions,
  UmlGenerationResult
} from "./contracts.js";

function optionDiagnostics(options: GeneratorOptions): UmlGenerationResult | undefined {
  if (options.systemName !== undefined && typeof options.systemName !== "string") {
    return { ok: false, diagnostics: [{ code: "HU-UML-007", severity: "error", message: "systemName must be a string." }] };
  }
  if (options.format !== undefined && options.format !== "svg" && options.format !== "json") {
    return { ok: false, diagnostics: [{ code: "HU-UML-007", severity: "error", message: "format must be svg or json." }] };
  }
  return undefined;
}

export function generateUseCase(
  model: HumanRequirementsModel,
  options: GeneratorOptions = {}
): UmlGenerationResult {
  const invalidOptions = optionDiagnostics(options);
  if (invalidOptions) return invalidOptions;
  const mapping = mapUseCaseDiagram(model, options);
  const diagnostics = [...mapping.diagnostics];
  if (!mapping.diagram || diagnostics.some(item => item.severity === "error")) {
    return {
      ok: false,
      ...(mapping.diagram ? { diagram: mapping.diagram } : {}),
      diagnostics
    };
  }
  diagnostics.push(...validateUseCaseDiagram(mapping.diagram));
  if (diagnostics.some(item => item.severity === "error")) {
    return { ok: false, diagram: mapping.diagram, diagnostics };
  }
  const {
    systemName: _systemName,
    format: _format,
    ...layoutOptions
  } = options;
  const layout = layoutUseCaseDiagram(mapping.diagram, layoutOptions);
  diagnostics.push(...layout.diagnostics);
  if (!layout.layout || diagnostics.some(item => item.severity === "error")) {
    return {
      ok: false,
      diagram: mapping.diagram,
      ...(layout.layout ? { layout: layout.layout } : {}),
      diagnostics
    };
  }
  if (options.format === "json") {
    return {
      ok: true,
      diagram: mapping.diagram,
      layout: layout.layout,
      json: JSON.stringify(mapping.diagram, null, 2) + "\n",
      diagnostics
    };
  }
  const rendered = renderUseCaseSvg(mapping.diagram, layout.layout);
  diagnostics.push(...rendered.diagnostics);
  return {
    ok: rendered.ok && diagnostics.every(item => item.severity !== "error"),
    diagram: mapping.diagram,
    layout: layout.layout,
    ...(rendered.svg ? { svg: rendered.svg } : {}),
    diagnostics
  };
}

export interface UmlGenerator {
  generateUseCase(model: HumanRequirementsModel, options?: GeneratorOptions): UmlGenerationResult;
}

export function createUmlGenerator(): UmlGenerator {
  return { generateUseCase };
}
