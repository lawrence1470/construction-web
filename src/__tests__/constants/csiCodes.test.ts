import { describe, it, expect, beforeAll } from "vitest";
import {
  loadCsiData,
  formatCsiCodeWith,
  type CsiData,
} from "@/lib/constants/csiCodes";
import { CSI_CODE_SET } from "@/lib/constants/csiCodeSet";
import rawData from "@/lib/constants/csiCodes.json";

let data: CsiData;
beforeAll(async () => {
  data = await loadCsiData();
});

// Every selectable code in the tree: Level-2 group headings + their Level-3/4
// section children.
function treeLeafCodes(): string[] {
  const codes: string[] = [];
  for (const div of data.tree) {
    for (const group of div.groups) {
      codes.push(group.code);
      for (const section of group.sections) codes.push(section.code);
    }
  }
  return codes;
}

describe("CSI_TREE — derived 3-tier hierarchy", () => {
  it("preserves every flat code, with none invented or duplicated", () => {
    const leaves = treeLeafCodes();
    const leafSet = new Set(leaves);

    // No duplicates introduced by grouping.
    expect(leafSet.size).toBe(leaves.length);

    // Exactly the flat set of subdivision codes — nothing lost, nothing added.
    expect(leafSet.size).toBe(data.subdivisionMap.size);
    for (const code of data.subdivisionMap.keys()) {
      expect(leafSet.has(code)).toBe(true);
    }
  });

  it("has 35 divisions matching the flat division map", () => {
    expect(data.tree.length).toBe(35);
    expect(data.tree.length).toBe(data.divisionMap.size);
  });

  it("nests Level-3 details under their Level-2 heading (03 30 00)", () => {
    const div03 = data.tree.find((d) => d.code === "03");
    expect(div03).toBeDefined();
    const castInPlace = div03!.groups.find((g) => g.code === "03 30 00");
    expect(castInPlace).toBeDefined();
    const childCodes = castInPlace!.sections.map((s) => s.code);
    // Known Level-3 children of Cast-in-Place Concrete.
    expect(childCodes).toContain("03 31 00");
    expect(childCodes).toContain("03 33 00");
    expect(childCodes).toContain("03 35 00");
    // Every section's second-pair shares the heading's first digit ("3").
    for (const s of castInPlace!.sections) {
      expect(s.code.split(" ")[1]![0]).toBe("3");
    }
  });

  it("nests Level-4 details alongside their Level-3 sibling (31 23 19)", () => {
    const div31 = data.tree.find((d) => d.code === "31");
    const earthMoving = div31!.groups.find((g) => g.code === "31 20 00");
    const codes = earthMoving!.sections.map((s) => s.code);
    // Level-4 "31 23 19 Dewatering" sits under 31 20 00 next to "31 23 00".
    expect(codes).toContain("31 23 00");
    expect(codes).toContain("31 23 19");
  });

  it("places orphan Level-3 codes directly under their division (none dropped)", () => {
    // These have no Level-2 parent heading in the data and must be promoted to
    // Level-2 leaves under their own division.
    const orphans = ["33 92 00"];
    for (const code of orphans) {
      const divCode = code.split(" ")[0]!;
      const div = data.tree.find((d) => d.code === divCode);
      expect(div).toBeDefined();
      const asGroup = div!.groups.find((g) => g.code === code);
      expect(asGroup).toBeDefined();
      expect(asGroup!.sections.length).toBe(0);
    }
  });

  it("every section's parent heading shares its XX <Y> prefix", () => {
    for (const div of data.tree) {
      for (const group of div.groups) {
        for (const section of group.sections) {
          // group "03 30 00" -> prefix "03 3"; section "03 31 00" starts with it.
          const prefix = group.code.slice(0, 4);
          expect(section.code.startsWith(prefix)).toBe(true);
        }
      }
    }
  });
});

describe("flat lookups remain intact", () => {
  it("resolves Level-2 and Level-3 codes via formatCsiCodeWith", () => {
    expect(formatCsiCodeWith(data, "03 30 00")).toBe(
      "03 30 00 - Cast-in-Place Concrete",
    );
    expect(data.subdivisionMap.has("03 31 00")).toBe(true);
    // unknown → raw code
    expect(formatCsiCodeWith(data, "99 99 99")).toBe("99 99 99");
    // no data → raw code (lazy-load not resolved yet)
    expect(formatCsiCodeWith(null, "03 30 00")).toBe("03 30 00");
  });
});

describe("csiCodeSet.json stays in sync with csiCodes.json", () => {
  it("contains exactly the same codes (divisions + subdivisions)", () => {
    const fromFull = new Set<string>();
    for (const div of rawData) {
      fromFull.add(div.code);
      for (const sub of div.subdivisions) fromFull.add(sub.code);
    }
    // Same size and same membership — guards against the generated codes-only
    // validation file drifting from the full dataset.
    expect(CSI_CODE_SET.size).toBe(fromFull.size);
    for (const code of fromFull) expect(CSI_CODE_SET.has(code)).toBe(true);
  });
});
