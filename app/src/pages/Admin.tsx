import { useMemo, useState } from "react";

/**
 * Typography audit. Hidden page reached by clicking "Admin" in the sidebar.
 * Cross-references three things:
 *   1. Project tokens defined in tailwind.config.js
 *   2. Figma Prism Foundations type usage tokens
 *   3. Ad-hoc `text-[Npx]` usages found in the source
 *
 * When `typefix` is on (V34 selected) the displayed tokens, the Figma match
 * notes, and the ad-hoc usages reflect the runtime overrides from `.typefix`
 * in index.css — that's what the V34 build actually ships.
 */

interface ProjectToken {
  name: string;
  cls: string;
  size: number;
  lineHeight: number;
  weight: number;
  sample: string;
}

/** Base values straight from tailwind.config.js. */
const BASE_PROJECT_TOKENS: ProjectToken[] = [
  { name: "display-lg", cls: "text-display-lg", size: 32, lineHeight: 40, weight: 700, sample: "Dock management" },
  { name: "display-md", cls: "text-display-md", size: 24, lineHeight: 28, weight: 700, sample: "Section heading" },
  { name: "title-lg", cls: "text-title-lg", size: 20, lineHeight: 24, weight: 700, sample: "Sheet H2" },
  { name: "title-md", cls: "text-title-md", size: 18, lineHeight: 22, weight: 700, sample: "Card title" },
  { name: "body-lg-strong", cls: "text-body-lg-strong", size: 16, lineHeight: 22, weight: 700, sample: "Automatically assign" },
  { name: "body-lg", cls: "text-body-lg", size: 16, lineHeight: 22, weight: 500, sample: "Large body copy" },
  { name: "body-md-strong", cls: "text-body-md-strong", size: 14, lineHeight: 20, weight: 700, sample: "Button label" },
  { name: "body-md", cls: "text-body-md", size: 14, lineHeight: 20, weight: 400, sample: "Default body copy" },
  { name: "body-sm-strong", cls: "text-body-sm-strong", size: 12, lineHeight: 18, weight: 600, sample: "Caption strong" },
  { name: "body-sm", cls: "text-body-sm", size: 12, lineHeight: 18, weight: 400, sample: "Caption / helper" },
  { name: "label-xs-strong", cls: "text-label-xs-strong", size: 10, lineHeight: 18, weight: 700, sample: "APPOINTMENT TIME" },
  { name: "label-xs", cls: "text-label-xs", size: 10, lineHeight: 18, weight: 400, sample: "© mapbox" },
];

/** Values after the V34 `.typefix` CSS rules in index.css apply. */
const TYPEFIX_PROJECT_TOKENS: ProjectToken[] = [
  { name: "display-lg", cls: "text-display-lg", size: 32, lineHeight: 40, weight: 700, sample: "Dock management" },
  { name: "display-md", cls: "text-display-md", size: 24, lineHeight: 28, weight: 700, sample: "Section heading" },
  { name: "title-lg", cls: "text-title-lg", size: 20, lineHeight: 24, weight: 700, sample: "Sheet H2" },
  { name: "title-md", cls: "text-title-md", size: 18, lineHeight: 22, weight: 700, sample: "Card title" },
  { name: "body-lg-strong", cls: "text-body-lg-strong", size: 16, lineHeight: 24, weight: 700, sample: "Automatically assign" },
  { name: "body-lg", cls: "text-body-lg", size: 16, lineHeight: 24, weight: 400, sample: "Large body copy" },
  { name: "body-md-strong", cls: "text-body-md-strong", size: 14, lineHeight: 22, weight: 700, sample: "Button label" },
  { name: "body-md", cls: "text-body-md", size: 14, lineHeight: 22, weight: 400, sample: "Default body copy" },
  { name: "body-sm-strong", cls: "text-body-sm-strong", size: 12, lineHeight: 20, weight: 700, sample: "Caption strong" },
  { name: "body-sm", cls: "text-body-sm", size: 12, lineHeight: 20, weight: 400, sample: "Caption / helper" },
  { name: "label-xs-strong", cls: "text-label-xs-strong", size: 10, lineHeight: 18, weight: 700, sample: "APPOINTMENT TIME" },
  { name: "label-xs", cls: "text-label-xs", size: 10, lineHeight: 18, weight: 400, sample: "© mapbox" },
];

interface FigmaToken {
  name: string;
  size: number;
  lineHeight: number;
  weight: number;
  projectMatch: string | null;
  matchNotes?: string;
}

const BASE_FIGMA_TOKENS: FigmaToken[] = [
  { name: "display/large", size: 32, lineHeight: 40, weight: 700, projectMatch: "display-lg" },
  { name: "display/medium", size: 24, lineHeight: 28, weight: 700, projectMatch: "display-md" },
  { name: "title/large", size: 20, lineHeight: 24, weight: 700, projectMatch: "title-lg" },
  { name: "title/medium", size: 18, lineHeight: 22, weight: 700, projectMatch: "title-md" },
  { name: "label/large/strong", size: 16, lineHeight: 24, weight: 700, projectMatch: "body-lg-strong", matchNotes: "Line height differs (Figma 24 vs project 22)" },
  { name: "label/large/default", size: 16, lineHeight: 24, weight: 400, projectMatch: null, matchNotes: "Closest body-lg is weight 500, lh 22" },
  { name: "label/medium/strong", size: 14, lineHeight: 22, weight: 700, projectMatch: "body-md-strong", matchNotes: "Line height differs (Figma 22 vs project 20)" },
  { name: "label/medium/default", size: 14, lineHeight: 22, weight: 400, projectMatch: "body-md", matchNotes: "Line height differs (Figma 22 vs project 20)" },
  { name: "label/small/strong", size: 12, lineHeight: 20, weight: 700, projectMatch: "body-sm-strong", matchNotes: "Weight differs (Figma 700, project 600); lh differs (20 vs 18)" },
  { name: "label/small/default", size: 12, lineHeight: 20, weight: 400, projectMatch: "body-sm", matchNotes: "Line height differs (Figma 20 vs project 18)" },
  { name: "label/x-small/strong", size: 10, lineHeight: 18, weight: 700, projectMatch: "label-xs-strong" },
  { name: "label/x-small/default", size: 10, lineHeight: 18, weight: 400, projectMatch: "label-xs" },
  { name: "body/large/strong", size: 16, lineHeight: 24, weight: 700, projectMatch: "body-lg-strong", matchNotes: "Line height differs (Figma 24 vs project 22)" },
  { name: "body/large/default", size: 16, lineHeight: 24, weight: 400, projectMatch: null, matchNotes: "Closest body-lg is weight 500, lh 22" },
  { name: "body/medium/strong", size: 14, lineHeight: 22, weight: 700, projectMatch: "body-md-strong", matchNotes: "Line height differs" },
  { name: "body/medium/default", size: 14, lineHeight: 22, weight: 400, projectMatch: "body-md", matchNotes: "Line height differs" },
  { name: "body/small/strong", size: 12, lineHeight: 20, weight: 700, projectMatch: "body-sm-strong", matchNotes: "Weight + line height differ" },
  { name: "body/small/default", size: 12, lineHeight: 20, weight: 400, projectMatch: "body-sm", matchNotes: "Line height differs" },
];

/**
 * In Typefix mode the body/label tokens are corrected to match Prism exactly.
 * `label/large/default` and `body/large/default` (16/24/400) pick up `text-body-lg`
 * once its weight drops from 500 to 400.
 */
function applyTypefixToFigmaTokens(tokens: FigmaToken[]): FigmaToken[] {
  return tokens.map((t) => {
    if (t.projectMatch == null) {
      if (t.size === 16 && t.weight === 400)
        return { ...t, projectMatch: "body-lg", matchNotes: undefined };
      return t;
    }
    return { ...t, matchNotes: undefined };
  });
}

interface AdHocUsage {
  size: number;
  weight?: number;
  file: string;
  line: number;
  context: string;
}

const AD_HOC_USAGES: AdHocUsage[] = [
  { size: 11, file: "components/TruckDetailSheet.tsx", line: 180, context: "Map overlay pill" },
  { size: 11, file: "components/TruckDetailSheet.tsx", line: 202, context: "'Copied' affordance" },
  { size: 12, file: "components/TruckCard.tsx", line: 571, context: "Truck card sub-text" },
  { size: 12, file: "components/TruckCard.tsx", line: 574, context: "Truck card sub-text" },
  { size: 12, file: "components/TruckDetailSheet.tsx", line: 149, context: "Status pill" },
  { size: 12, file: "components/TruckDetailSheet.tsx", line: 191, context: "Shipment ID label" },
  { size: 12, file: "components/TruckDetailSheet.tsx", line: 249, context: "Merchants table header" },
  { size: 12, file: "components/TruckDetailSheet.tsx", line: 293, context: "Parcels table header" },
  { size: 12, file: "components/TruckDetailSheet.tsx", line: 307, context: "Status chip" },
  { size: 12, file: "components/TruckDetailSheet.tsx", line: 338, context: "Stat label" },
  { size: 14, file: "components/Sidebar.tsx", line: 107, context: "Brand wordmark" },
  { size: 14, file: "components/Sidebar.tsx", line: 117, context: "Facility code" },
  { size: 14, file: "components/TruckDetailSheet.tsx", line: 192, context: "Shipment ID value" },
  { size: 14, file: "components/TruckDetailSheet.tsx", line: 209, context: "Timing dl" },
  { size: 14, file: "components/TruckDetailSheet.tsx", line: 265, context: "Merchants row" },
  { size: 14, file: "components/TruckDetailSheet.tsx", line: 301, context: "Parcels row" },
  { size: 14, file: "components/TruckDetailSheet.tsx", line: 366, context: "Info card body" },
  { size: 16, file: "components/PopoverMenu.tsx", line: 67, context: "Menu item label" },
  { size: 16, file: "components/TruckDetailSheet.tsx", line: 208, context: "Timing heading" },
  { size: 16, file: "components/TruckDetailSheet.tsx", line: 365, context: "Info card title" },
  { size: 24, file: "components/TruckDetailSheet.tsx", line: 339, context: "Stat value (bold) — consider text-display-md" },
];

const FIGMA_BASE_SIZES = new Set([10, 12, 14, 16, 18, 20, 24, 32]);

/**
 * Where each project token is used. Counts come from
 *   grep -rn "text-<token>\b" src --include="*.tsx"
 * (excluding Admin.tsx itself) and are baked in for the audit. Refresh by
 * re-running the grep if you add a lot of new usages.
 */
interface TokenUsage {
  totalUsages: number;
  topFiles: { file: string; count: number }[];
}

const PROJECT_TOKEN_USAGE: Record<string, TokenUsage> = {
  "display-lg": {
    totalUsages: 3,
    topFiles: [
      { file: "components/PageHeader.tsx", count: 1 },
      { file: "components/PageHeaderV2.tsx", count: 1 },
      { file: "components/ErrorModal.tsx", count: 1 },
    ],
  },
  "display-md": { totalUsages: 0, topFiles: [] },
  "title-md": {
    totalUsages: 2,
    topFiles: [
      { file: "components/DockSettingsModal.tsx", count: 1 },
      { file: "components/ConflictModal.tsx", count: 1 },
    ],
  },
  "body-lg-strong": {
    totalUsages: 2,
    topFiles: [
      { file: "components/PageHeader.tsx", count: 1 },
      { file: "components/UnassignedRail.tsx", count: 1 },
    ],
  },
  "body-lg": {
    totalUsages: 1,
    topFiles: [{ file: "components/ErrorModal.tsx", count: 1 }],
  },
  "body-md-strong": {
    totalUsages: 38,
    topFiles: [
      { file: "components/DockSettingsModal.tsx", count: 16 },
      { file: "components/PageHeaderV2.tsx", count: 7 },
      { file: "components/LegendBar.tsx", count: 4 },
    ],
  },
  "body-md": {
    totalUsages: 17,
    topFiles: [
      { file: "components/TruckCard.tsx", count: 3 },
      { file: "components/Sidebar.tsx", count: 2 },
      { file: "components/PageHeader.tsx", count: 2 },
    ],
  },
  "body-sm-strong": {
    totalUsages: 8,
    topFiles: [
      { file: "components/TruckCard.tsx", count: 2 },
      { file: "components/Sidebar.tsx", count: 2 },
      { file: "components/ScheduleGrid.tsx", count: 2 },
    ],
  },
  "body-sm": {
    totalUsages: 18,
    topFiles: [
      { file: "components/DockSettingsModal.tsx", count: 4 },
      { file: "components/Sidebar.tsx", count: 3 },
      { file: "components/Tooltip.tsx", count: 1 },
    ],
  },
  "title-lg": {
    totalUsages: 3,
    topFiles: [{ file: "components/TruckDetailSheet.tsx", count: 3 }],
  },
  "label-xs-strong": {
    totalUsages: 1,
    topFiles: [{ file: "components/ScheduleGrid.tsx", count: 1 }],
  },
  "label-xs": {
    totalUsages: 1,
    topFiles: [{ file: "components/TruckDetailSheet.tsx", count: 1 }],
  },
};

/** Off-grid ad-hoc sizes are snapped to Prism sizes by Typefix. */
const TYPEFIX_SNAP: Record<number, number> = { 11: 12, 22: 20 };

type Tab = "tokens" | "figma" | "adhoc";

export function Admin({ typefix = false }: { typefix?: boolean } = {}) {
  const [tab, setTab] = useState<Tab>("tokens");

  const projectTokens = typefix ? TYPEFIX_PROJECT_TOKENS : BASE_PROJECT_TOKENS;
  const figmaTokens = typefix ? applyTypefixToFigmaTokens(BASE_FIGMA_TOKENS) : BASE_FIGMA_TOKENS;

  const adhocStats = useMemo(() => {
    const grouped = new Map<number, AdHocUsage[]>();
    for (const u of AD_HOC_USAGES) {
      const arr = grouped.get(u.size) ?? [];
      arr.push(u);
      grouped.set(u.size, arr);
    }
    return [...grouped.entries()].sort((a, b) => b[0] - a[0]);
  }, []);

  return (
    <div className="h-full overflow-y-auto">
      <div className="px-10 pt-8 pb-4 border-b border-line">
        <h1 className="text-display-lg text-ink">Typography audit</h1>
        <p className="mt-2 text-body-md text-ink-subdued">
          Tokens defined in <code className="font-mono">tailwind.config.js</code>, cross-checked against
          Prism Foundations and every <code className="font-mono">text-[Npx]</code> usage in the codebase.
        </p>
        {typefix && (
          <div className="mt-4 inline-flex items-start gap-2 rounded-card border border-positive/30 bg-positive-bg px-3 py-2">
            <span className="text-body-sm-strong text-positive whitespace-nowrap">V34 Typefix active</span>
            <span className="text-body-sm text-ink">
              Every Prism type token now maps to a project token exactly. The 11px map-overlay pill is
              the only remaining ad-hoc size; it snaps to 12px via the <code className="font-mono">.typefix</code>
              {" "}rule.
            </span>
          </div>
        )}
        <div className="mt-6 flex gap-1">
          {(
            [
              { id: "tokens", label: "Project tokens" },
              { id: "figma", label: "Figma mapping" },
              { id: "adhoc", label: "Ad-hoc usages" },
            ] as { id: Tab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={
                "h-9 px-3 rounded-button text-body-md-strong " +
                (tab === t.id
                  ? "bg-ink text-white"
                  : "text-ink-subdued hover:bg-surface-hovered")
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-10 py-8">
        {tab === "tokens" && (
          <div className="flex flex-col gap-6">
            {projectTokens.map((t) => (
              <div key={t.name} className="grid grid-cols-[260px_1fr] gap-8 pb-6 border-b border-line">
                <div>
                  <div className="font-mono text-body-sm-strong text-ink">{t.cls}</div>
                  <div className="mt-2 text-body-sm text-ink-subdued">
                    {t.size}px / {t.lineHeight}px lh / weight {t.weight}
                  </div>
                </div>
                <div className={t.cls + " text-ink"}>{t.sample}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "figma" && (
          <div className="overflow-hidden rounded-card border border-line">
            <table className="w-full text-left">
              <thead className="bg-surface-subdued text-body-sm-strong text-ink-subdued">
                <tr>
                  <th className="px-4 py-3">Figma token</th>
                  <th className="px-4 py-3">Size / lh / weight</th>
                  <th className="px-4 py-3">Project match</th>
                  <th className="px-4 py-3">Used at</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="text-body-sm text-ink">
                {figmaTokens.map((f) => {
                  const matchKind = f.projectMatch == null
                    ? "missing"
                    : f.matchNotes
                    ? "partial"
                    : "exact";
                  const usage = f.projectMatch ? PROJECT_TOKEN_USAGE[f.projectMatch] : undefined;
                  // For missing rows, surface ad-hoc usages at the same size.
                  const adhocAtSize = f.projectMatch
                    ? []
                    : AD_HOC_USAGES.filter((u) => u.size === f.size);
                  return (
                    <tr key={f.name} className="border-t border-line align-top">
                      <td className="px-4 py-3 font-mono">{f.name}</td>
                      <td className="px-4 py-3">
                        {f.size}px / {f.lineHeight} / {f.weight}
                      </td>
                      <td className="px-4 py-3">
                        {f.projectMatch ? (
                          <span className="font-mono">text-{f.projectMatch}</span>
                        ) : (
                          <span className="text-negative">— none —</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-body-sm">
                        {usage ? (
                          usage.totalUsages === 0 ? (
                            <span className="text-ink-subdued">Token defined but unused</span>
                          ) : (
                            <>
                              <div className="text-ink-subdued">{usage.totalUsages} usages</div>
                              <ul className="mt-1 font-mono text-ink-subdued">
                                {usage.topFiles.map((u) => (
                                  <li key={u.file}>
                                    {u.file} <span className="text-ink">×{u.count}</span>
                                  </li>
                                ))}
                              </ul>
                            </>
                          )
                        ) : adhocAtSize.length > 0 ? (
                          <>
                            <div className="text-negative">{adhocAtSize.length} ad-hoc usages</div>
                            <ul className="mt-1 font-mono text-ink-subdued">
                              {adhocAtSize.slice(0, 3).map((u, i) => (
                                <li key={i}>
                                  {u.file}:{u.line}
                                </li>
                              ))}
                              {adhocAtSize.length > 3 && (
                                <li className="text-ink-subdued">…and {adhocAtSize.length - 3} more</li>
                              )}
                            </ul>
                          </>
                        ) : (
                          <span className="text-ink-subdued">Not used in project</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            "inline-block px-2 py-0.5 rounded-tag text-body-sm-strong mr-2 " +
                            (matchKind === "exact"
                              ? "bg-positive-bg text-positive"
                              : matchKind === "partial"
                              ? "bg-surface-strong text-ink"
                              : "bg-negative-bg text-negative")
                          }
                        >
                          {matchKind}
                        </span>
                        {f.matchNotes ?? "Identical"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {tab === "adhoc" && (
          <div className="flex flex-col gap-8">
            <p className="text-body-md text-ink-subdued max-w-2xl">
              {AD_HOC_USAGES.length} <code className="font-mono">text-[Npx]</code> usages across the
              project.{" "}
              {typefix ? (
                <>
                  In V34, off-grid sizes (<span className="font-mono">11px</span>,{" "}
                  <span className="font-mono">22px</span>) are snapped to the nearest Prism base size at
                  runtime via <code className="font-mono">.typefix</code> CSS rules.
                </>
              ) : (
                <>
                  Sizes <span className="font-mono">11px</span> and{" "}
                  <span className="font-mono">22px</span> are off-grid and don&apos;t map to any Prism base
                  size — replace with the nearest token.
                </>
              )}
            </p>
            {adhocStats.map(([size, usages]) => {
              const onGrid = FIGMA_BASE_SIZES.has(size);
              const snappedTo = TYPEFIX_SNAP[size];
              const fixedByTypefix = typefix && snappedTo !== undefined;
              return (
                <div key={size}>
                  <div className="flex items-baseline gap-3 mb-3">
                    <span className="font-mono text-display-md text-ink">{size}px</span>
                    <span className="text-body-md text-ink-subdued">{usages.length} usages</span>
                    <span
                      className={
                        "px-2 py-0.5 rounded-tag text-body-sm-strong " +
                        (onGrid
                          ? "bg-positive-bg text-positive"
                          : fixedByTypefix
                          ? "bg-positive-bg text-positive"
                          : "bg-negative-bg text-negative")
                      }
                    >
                      {onGrid
                        ? "on Prism grid"
                        : fixedByTypefix
                        ? `snapped to ${snappedTo}px by Typefix`
                        : "off-grid — replace"}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: (fixedByTypefix ? snappedTo : size) + "px", lineHeight: 1.3 }}
                    className="text-ink mb-3"
                  >
                    The quick brown fox jumps over the lazy dog
                  </div>
                  <ul className="text-body-sm text-ink-subdued space-y-1 font-mono">
                    {usages.map((u, i) => (
                      <li key={i}>
                        {u.file}:{u.line} — <span className="text-ink">{u.context}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
