
import { describe, expect, it } from "vitest";

import {
  validateModel
} from "../../packages/requirements-model/src/index.js";

import type {
  HumanRequirementsModel
} from "../../packages/contracts/src/hrm.js";

const evidence = {
  sentenceIndex: 0,
  span: { start: 0, end: 4 },
  text: "Test"
};

function createModel(): HumanRequirementsModel {
  return {
    schemaVersion: "1.0.0",
    language: "en",
    grammarVersion: "CE-1",
    concepts: [
      {
        id: "actor:student",
        name: "student",
        kind: "actor",
        evidence: [structuredClone(evidence)]
      },
      {
        id: "entity:book",
        name: "book",
        kind: "entity",
        evidence: [structuredClone(evidence)]
      },
      {
        id: "entity:manager",
        name: "manager",
        kind: "entity",
        evidence: [structuredClone(evidence)]
      },
      {
        id: "entity:employee",
        name: "employee",
        kind: "entity",
        evidence: [structuredClone(evidence)]
      },
      {
        id: "entity:supervisor",
        name: "supervisor",
        kind: "entity",
        evidence: [structuredClone(evidence)]
      }
    ],
    actions: [],
    relations: []
  };
}

function hasError(
  model: HumanRequirementsModel,
  code: string,
  source?: string
): boolean {
  return validateModel(
    model,
    source === undefined ? {} : { source }
  ).some(d => d.code === code);
}

describe("HumanUML Advanced HRM Validation", () => {
  it("accepts a valid model", () => {
    expect(validateModel(createModel())).toEqual([]);
  });

  it("rejects actor used as action object", () => {
    const model = createModel();

    model.actions.push({
      id: "action:1",
      actorId: "actor:student",
      objectId: "actor:student",
      verb: "borrow",
      modality: "permitted",
      evidence: [structuredClone(evidence)]
    });

    expect(hasError(model, "HU-MOD-003")).toBe(true);
  });

  it("rejects missing concept references", () => {
    const model = createModel();

    model.actions.push({
      id: "action:1",
      actorId: "actor:unknown",
      verb: "borrow",
      modality: "permitted",
      evidence: [structuredClone(evidence)]
    });

    expect(hasError(model, "HU-MOD-001")).toBe(true);
  });

  it("detects indirect inheritance cycles", () => {
    const model = createModel();

    model.relations = [
      ["entity:manager", "entity:employee"],
      ["entity:employee", "entity:supervisor"],
      ["entity:supervisor", "entity:manager"]
    ].map(([from, to], i) => ({
      id: `relation:${i}`,
      fromId: from!,
      toId: to!,
      type: "specializes" as const,
      evidence: [structuredClone(evidence)]
    }));

    expect(hasError(model, "HU-SEM-005")).toBe(true);
  });

  it("accepts an inheritance chain without cycles", () => {
    const model = createModel();

    model.relations = [
      {
        id: "relation:1",
        fromId: "entity:manager",
        toId: "entity:employee",
        type: "specializes",
        evidence: [structuredClone(evidence)]
      },
      {
        id: "relation:2",
        fromId: "entity:employee",
        toId: "entity:supervisor",
        type: "specializes",
        evidence: [structuredClone(evidence)]
      }
    ];

    expect(hasError(model, "HU-SEM-005")).toBe(false);
  });

  it("rejects duplicate evidence", () => {
    const model = createModel();

    model.concepts[0]!.evidence.push(
      structuredClone(evidence)
    );

    expect(hasError(model, "HU-MOD-005")).toBe(true);
  });

  it("rejects invalid source spans", () => {
    const model = createModel();

    model.concepts[0]!.evidence[0]!.span.start = -1;

    expect(hasError(model, "HU-MOD-006")).toBe(true);
  });

  it("rejects source text mismatches", () => {
    expect(
      hasError(
        createModel(),
        "HU-MOD-006",
        "Different source text"
      )
    ).toBe(true);
  });

  it("accepts matching source evidence", () => {
    expect(
      validateModel(
        createModel(),
        { source: "Test" }
      )
    ).toEqual([]);
  });

  it("rejects duplicate model identifiers", () => {
    const model = createModel();

    model.concepts[1]!.id =
      model.concepts[0]!.id;

    expect(hasError(model, "HU-MOD-002")).toBe(true);
  });
});
