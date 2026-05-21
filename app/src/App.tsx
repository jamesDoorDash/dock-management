import { useEffect, useState } from "react";
import { Sidebar, VERSION_OPTIONS, type PrototypeVersion } from "./components/Sidebar";
import { DockManagementV1 } from "./pages/DockManagementV1";
import { DockManagementV2 } from "./pages/DockManagementV2";
import { DockManagementV3 } from "./pages/DockManagementV3";
import { Admin } from "./pages/Admin";
import type { Treatment } from "./components/TruckCard";

const TREATMENT_VERSIONS: PrototypeVersion[] = [
  "v4",
  "v5",
  "v6",
  "v7",
  "v8",
  "v9",
  "v10",
  "v11",
  "v12",
  "v13",
  "v14",
  "v15",
  "v16",
  "v17",
  "v18",
  "v19",
  "v20",
  "v21",
  "v22",
  "v23",
  "v24",
  "v25",
  "v26",
  "v27",
  "v28",
  "v29",
  "v30",
  "v31",
  "v32",
  "v33",
];

function versionToTreatment(v: PrototypeVersion): Treatment {
  // V34 (Typefix) is V20's TruckCard treatment with type overrides layered on
  // top via the `.typefix` CSS scope.
  if (v === "v34" || v === "v35" || v === "v36" || v === "v37" || v === "v38" || v === "v39") return "v20" as Treatment;
  if (TREATMENT_VERSIONS.includes(v)) return v as Treatment;
  return "default";
}

export default function App() {
  const [version, setVersion] = useState<PrototypeVersion>("v39");
  const [adminOpen, setAdminOpen] = useState(false);

  // Arrow-key navigation across the prototype list.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Ignore when typing in a text field.
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        (t && (t.isContentEditable))
      ) {
        return;
      }
      const ids = VERSION_OPTIONS.map((o) => o.id);
      const idx = ids.indexOf(version);
      if (idx < 0) return;
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const next = ids[(idx + delta + ids.length) % ids.length];
      setVersion(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [version]);

  return (
    <div className={"h-full flex bg-white" + (version === "v34" || version === "v35" || version === "v36" || version === "v37" || version === "v38" || version === "v39" ? " typefix" : "")}>
      <Sidebar
        version={version}
        onVersionChange={setVersion}
        adminOpen={adminOpen}
        onToggleAdmin={() => setAdminOpen((v) => !v)}
      />
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {adminOpen ? (
          <Admin typefix={version === "v34" || version === "v35" || version === "v36" || version === "v37" || version === "v38" || version === "v39"} />
        ) : version === "v1" ? (
          <DockManagementV1 />
        ) : version === "v2" ? (
          <DockManagementV2 />
        ) : (
          <DockManagementV3 treatment={versionToTreatment(version)} typefix={version === "v34" || version === "v35" || version === "v36" || version === "v37" || version === "v38" || version === "v39"} declutter={version === "v35" || version === "v36" || version === "v37" || version === "v38" || version === "v39"} legendAttached={version === "v36" || version === "v37" || version === "v38"} redLate={version === "v37"} autoReassignLabel={version === "v36" || version === "v37" || version === "v38" || version === "v39"} prismIcon={version === "v39"} />
        )}
      </main>
    </div>
  );
}
