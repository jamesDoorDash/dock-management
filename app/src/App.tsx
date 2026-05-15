import { useState } from "react";
import { Sidebar, type PrototypeVersion } from "./components/Sidebar";
import { DockManagementV1 } from "./pages/DockManagementV1";
import { DockManagementV2 } from "./pages/DockManagementV2";

export default function App() {
  const [version, setVersion] = useState<PrototypeVersion>("v2");

  return (
    <div className="h-full flex bg-white">
      <Sidebar version={version} onVersionChange={setVersion} />
      <main className="flex-1 min-w-0 flex flex-col">
        {version === "v1" ? <DockManagementV1 /> : <DockManagementV2 />}
      </main>
    </div>
  );
}
