// Full CSI data: names + the derived 3-tier tree. This is the heavy payload
// (~606KB raw / ~68KB gzip, ~6,500 codes). It is loaded LAZILY via a dynamic
// import so the JSON lands in its own async chunk instead of every bundle that
// touches CSI codes:
//   - Validation (gantt.sync, csiSpec) → `csiCodeSet.ts` (codes only, tiny)
//   - Display (TaskHeader, document filters) + the picker → `loadCsiData()`
//     via the `useCsiData` / `useCsiName` hooks, which load on mount.
// Nothing here runs at module init; the maps and tree are built once on the
// first `loadCsiData()` call and cached.

export interface CsiDivision {
  code: string;
  name: string;
}

export interface CsiSubdivision {
  code: string; // e.g. "03 30 00"
  name: string; // e.g. "Cast-in-Place Concrete"
  nameLower: string; // pre-computed for search perf
}

// ─── Three-tier hierarchy (Division → Level-2 group → Level-3/4 section) ───
export type CsiSection = CsiSubdivision;

export interface CsiGroup {
  code: string;
  name: string;
  nameLower: string; // pre-computed for search perf
  sections: CsiSection[];
}

export interface CsiDivisionTree {
  code: string;
  name: string;
  nameLower: string; // pre-computed for search perf
  groups: CsiGroup[];
}

export interface CsiData {
  divisions: CsiDivision[];
  divisionMap: Map<string, CsiDivision>;
  subdivisionMap: Map<
    string,
    { subdivision: CsiSubdivision; division: CsiDivision }
  >;
  tree: CsiDivisionTree[];
}

type RawDivision = {
  code: string;
  name: string;
  subdivisions: { code: string; name: string }[];
};

// ─── Tree construction ──────────────────────────────────────────────────
// MasterFormat codes are "XX YY 00". The second pair `YY` determines the tier:
//   - "00"                     → division title  → selectable Level-2 leaf
//   - "01"–"09" or ends in 0   → Level-2 heading → sits under the division
//   - otherwise (11, 31, 33…)  → Level-3/4 detail → nests under "XX <Y>0 00"
// A detail code whose computed parent heading is absent is promoted to sit
// directly under its division (orphan handling) — nothing is dropped.
function isGroupPair(yy: string): boolean {
  return yy === "00" || yy[0] === "0" || yy[1] === "0";
}

function buildTree(rawData: RawDivision[]): CsiDivisionTree[] {
  return rawData.map((div) => {
    const subs = [...div.subdivisions].sort((a, b) =>
      a.code.localeCompare(b.code),
    );
    const groups: CsiGroup[] = [];
    const byCode = new Map<string, CsiGroup>();

    const pushGroup = (code: string, name: string): CsiGroup => {
      const g: CsiGroup = {
        code,
        name,
        nameLower: name.toLowerCase(),
        sections: [],
      };
      groups.push(g);
      byCode.set(code, g);
      return g;
    };

    for (const sub of subs) {
      const yy = sub.code.split(" ")[1] ?? "00";
      if (isGroupPair(yy)) {
        pushGroup(sub.code, sub.name);
      } else {
        const parentCode = `${div.code} ${yy[0]}0 00`;
        const parent = byCode.get(parentCode);
        const section: CsiSection = {
          code: sub.code,
          name: sub.name,
          nameLower: sub.name.toLowerCase(),
        };
        if (parent) {
          parent.sections.push(section);
        } else {
          // Orphan: no parent heading in the data — promote to a Level-2 leaf.
          pushGroup(sub.code, sub.name);
        }
      }
    }

    return {
      code: div.code,
      name: div.name,
      nameLower: div.name.toLowerCase(),
      groups,
    };
  });
}

function build(rawData: RawDivision[]): CsiData {
  const divisions: CsiDivision[] = rawData.map(({ code, name }) => ({
    code,
    name,
  }));
  const divisionMap = new Map<string, CsiDivision>();
  const subdivisionMap = new Map<
    string,
    { subdivision: CsiSubdivision; division: CsiDivision }
  >();

  for (const div of rawData) {
    const division: CsiDivision = { code: div.code, name: div.name };
    divisionMap.set(div.code, division);
    for (const sub of div.subdivisions) {
      subdivisionMap.set(sub.code, {
        subdivision: {
          code: sub.code,
          name: sub.name,
          nameLower: sub.name.toLowerCase(),
        },
        division,
      });
    }
  }

  return { divisions, divisionMap, subdivisionMap, tree: buildTree(rawData) };
}

// ─── Lazy loader ─────────────────────────────────────────────────────────
let cache: CsiData | null = null;
let inflight: Promise<CsiData> | null = null;

/**
 * Load the full CSI dataset (names + tree). The 606KB JSON is dynamically
 * imported once and the derived structures are memoized, so subsequent calls
 * resolve synchronously-fast from cache.
 */
export async function loadCsiData(): Promise<CsiData> {
  if (cache) return cache;
  inflight ??= import("./csiCodes.json").then((mod) => {
    cache = build((mod.default ?? mod) as unknown as RawDivision[]);
    inflight = null;
    return cache;
  });
  return inflight;
}

/** The already-loaded dataset, or null if `loadCsiData()` hasn't resolved yet. */
export function getLoadedCsiData(): CsiData | null {
  return cache;
}

/** Format a code as "CODE - Name" using loaded data; falls back to the raw code. */
export function formatCsiCodeWith(
  data: CsiData | null,
  code: string,
): string {
  if (!data) return code;
  const sub = data.subdivisionMap.get(code);
  if (sub) return `${code} - ${sub.subdivision.name}`;
  const div = data.divisionMap.get(code);
  if (div) return `${code} - ${div.name}`;
  return code;
}
