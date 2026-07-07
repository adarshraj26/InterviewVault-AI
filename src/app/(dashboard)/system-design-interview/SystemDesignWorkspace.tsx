"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { 
  Play, 
  Save, 
  History, 
  Layers, 
  Timer as TimerIcon, 
  Loader2, 
  CheckCircle, 
  Undo2, 
  Redo2, 
  AlignLeft, 
  Download, 
  Settings, 
  Cpu, 
  Database, 
  Network, 
  ShieldAlert, 
  FolderSync, 
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { toast } from "sonner";
import { GlassCard } from "@/components/shared";
import { cn } from "@/lib/utils";
import { 
  saveSystemDesignDraft, 
  createSystemDesignVersion, 
  submitSystemDesignEvaluation 
} from "@/actions/systemDesign";

const Excalidraw = dynamic(
  async () => {
    const mod = await import("@excalidraw/excalidraw");
    return mod.Excalidraw;
  },
  { ssr: false }
) as any;

interface Version {
  id: string;
  canvasState: string;
  screenshot: string | null;
  versionNumber: number;
  createdAt: Date;
}

interface SystemDesignWorkspaceProps {
  interview: {
    id: string;
    technology: string;
    difficulty: string;
    question: string;
    userExplanation: string | null;
    canvasState: string | null;
    screenshot: string | null;
  };
  initialVersions: any[];
}

// Categories of stencils for architectural components
const COMPONENT_LIBRARY = [
  {
    category: "Clients",
    icon: Cpu,
    items: [
      { label: "Web Client", shape: "rectangle" },
      { label: "Mobile App", shape: "rectangle" },
      { label: "Desktop App", shape: "rectangle" }
    ]
  },
  {
    category: "Network",
    icon: Network,
    items: [
      { label: "DNS", shape: "ellipse" },
      { label: "CDN", shape: "rectangle" },
      { label: "API Gateway", shape: "diamond" },
      { label: "Reverse Proxy", shape: "rectangle" },
      { label: "Load Balancer", shape: "diamond" }
    ]
  },
  {
    category: "Compute",
    icon: Cpu,
    items: [
      { label: "Web Server", shape: "rectangle" },
      { label: "Application Server", shape: "rectangle" },
      { label: "Worker", shape: "rectangle" },
      { label: "Microservice", shape: "rectangle" },
      { label: "Kubernetes Pod", shape: "rectangle" }
    ]
  },
  {
    category: "Database",
    icon: Database,
    items: [
      { label: "SQL Database", shape: "ellipse" },
      { label: "PostgreSQL", shape: "ellipse" },
      { label: "MySQL", shape: "ellipse" },
      { label: "MongoDB", shape: "ellipse" },
      { label: "Redis Cache", shape: "ellipse" },
      { label: "Cassandra DB", shape: "ellipse" },
      { label: "Elasticsearch", shape: "ellipse" }
    ]
  },
  {
    category: "Messaging & Queue",
    icon: Layers,
    items: [
      { label: "Kafka Broker", shape: "rectangle" },
      { label: "RabbitMQ", shape: "rectangle" },
      { label: "SQS Queue", shape: "rectangle" },
      { label: "Message Queue", shape: "rectangle" }
    ]
  },
  {
    category: "Storage",
    icon: Layers,
    items: [
      { label: "S3 Storage", shape: "ellipse" },
      { label: "Blob Storage", shape: "ellipse" },
      { label: "File Storage", shape: "ellipse" }
    ]
  },
  {
    category: "Security & Auth",
    icon: ShieldAlert,
    items: [
      { label: "OAuth Server", shape: "diamond" },
      { label: "JWT Auth", shape: "rectangle" },
      { label: "Auth Service", shape: "rectangle" }
    ]
  }
];

export default function SystemDesignWorkspace({ 
  interview,
  initialVersions 
}: SystemDesignWorkspaceProps) {
  const router = useRouter();
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const [explanation, setExplanation] = useState(interview.userExplanation || "");
  const [versions, setVersions] = useState<Version[]>(
    initialVersions.map(v => ({ ...v, createdAt: new Date(v.createdAt) }))
  );
  
  // States
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingVersion, setIsCreatingVersion] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"explanation" | "history">("explanation");
  const [showStencils, setShowStencils] = useState(true);
  const [showWorkspace, setShowWorkspace] = useState(true);

  // Ref to hold element states to prevent unnecessary saves
  const lastSavedStateRef = useRef<string>("");
  const lastOnChangeElementsRef = useRef<string>("");

  // Timer Effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Auto-Save Effect (saves draft every 15 seconds if canvas state or explanation changed)
  useEffect(() => {
    const autoSaveTimer = setInterval(async () => {
      if (!excalidrawAPI) return;
      const elements = excalidrawAPI.getSceneElements();
      const currentCanvasStr = JSON.stringify(elements);
      
      if (currentCanvasStr !== lastSavedStateRef.current || explanation !== interview.userExplanation) {
        lastSavedStateRef.current = currentCanvasStr;
        await saveSystemDesignDraft(interview.id, explanation, currentCanvasStr);
      }
    }, 15000);

    return () => clearInterval(autoSaveTimer);
  }, [excalidrawAPI, explanation, interview.id, interview.userExplanation]);

  // Load Initial Canvas State on excalidrawAPI ready
  useEffect(() => {
    if (excalidrawAPI && interview.canvasState) {
      try {
        const parsed = JSON.parse(interview.canvasState);
        const elements = Array.isArray(parsed) ? parsed : parsed.elements || [];
        excalidrawAPI.updateScene({ elements });
        lastSavedStateRef.current = JSON.stringify(elements);
      } catch (e) {
        console.error("Failed to parse initial canvasState:", e);
      }
    }
  }, [excalidrawAPI, interview.canvasState]);

  // Handle adding components to whiteboard
  const handleAddComponent = async (label: string, shape: string) => {
    if (!excalidrawAPI) {
      toast.error("Whiteboard is initializing. Please wait.");
      return;
    }

    try {
      const { convertToExcalidrawElements } = await import("@excalidraw/excalidraw");

      const appState = excalidrawAPI.getAppState() || {};
      const scrollX = appState.scrollX || 0;
      const scrollY = appState.scrollY || 0;

      // Position element in the upper-left quadrant of the currently visible canvas
      const x = -scrollX + 120;
      const y = -scrollY + 120;

      const elementId = `container_${Math.random().toString(36).substring(2, 9)}`;
      const textId = `text_${Math.random().toString(36).substring(2, 9)}`;

      // Stencil box colors
      const strokeColor = "#6366f1"; // Indigo
      const backgroundColor = "#1e293b"; // Slate 800

      const groupId = `group_${Math.random().toString(36).substring(2, 9)}`;

      const partialElements = [
        {
          id: elementId,
          type: shape as any,
          x,
          y,
          width: 150,
          height: 70,
          strokeColor,
          backgroundColor,
          fillStyle: "solid",
          strokeWidth: 2,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          locked: false,
          groupIds: [groupId],
          boundElements: [
            {
              id: textId,
              type: "text",
            },
          ],
        },
        {
          id: textId,
          type: "text" as const,
          x: x + 15,
          y: y + 23,
          width: 120,
          height: 24,
          strokeColor: "#ffffff",
          backgroundColor: "transparent",
          fillStyle: "solid",
          strokeWidth: 1,
          strokeStyle: "solid",
          roughness: 0,
          opacity: 100,
          text: label,
          fontSize: 14,
          fontFamily: 1, // Sans-serif
          textAlign: "center" as const,
          verticalAlign: "middle" as const,
          groupIds: [groupId],
          containerId: elementId
        }
      ] as any;

      const newElements = convertToExcalidrawElements(partialElements);
      const currentElements = excalidrawAPI.getSceneElements() || [];
      
      excalidrawAPI.updateScene({
        elements: [...currentElements, ...newElements]
      });
      toast.success(`Added ${label} to diagram`);
    } catch (err) {
      console.error("Failed to add component:", err);
      toast.error("Failed to add component to whiteboard.");
    }
  };

  // Auto layout Arrange Diagram
  const handleAutoLayout = () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const containers = elements.filter((el: any) => ["rectangle", "ellipse", "diamond"].includes(el.type));
    if (containers.length === 0) {
      toast.error("Please add components to the whiteboard first.");
      return;
    }

    // Sort containers by current Y position
    const sorted = [...containers].sort((a: any, b: any) => a.y - b.y);

    const startX = 300;
    const startY = 100;
    const spacingY = 150;

    const updatedElements = elements.map((el: any) => {
      const idx = sorted.findIndex((s: any) => s.id === el.id);
      if (idx !== -1) {
        return {
          ...el,
          x: startX - el.width / 2,
          y: startY + idx * spacingY,
        };
      }
      
      // Sync text label position
      if (el.type === "text" && el.containerId) {
        const parent = sorted.find((s: any) => s.id === el.containerId);
        if (parent) {
          const pIdx = sorted.findIndex((s: any) => s.id === parent.id);
          const parentNewX = startX - parent.width / 2;
          const parentNewY = startY + pIdx * spacingY;
          return {
            ...el,
            x: parentNewX + (parent.width - el.width) / 2,
            y: parentNewY + (parent.height - el.height) / 2,
          };
        }
      }
      return el;
    });

    excalidrawAPI.updateScene({ elements: updatedElements });
    toast.success("Whiteboard auto-layout aligned cleanly!");
  };



  // Toggle Grid
  const toggleGrid = () => {
    if (!excalidrawAPI) return;
    const current = gridEnabled;
    setGridEnabled(!current);
    excalidrawAPI.updateAppState({ gridSize: !current ? 20 : null });
    toast.success(!current ? "Grid enabled" : "Grid disabled");
  };

  // Manual save draft
  const handleSaveDraft = async () => {
    if (!excalidrawAPI) return;
    setIsSaving(true);
    const elements = excalidrawAPI.getSceneElements();
    const canvasStr = JSON.stringify(elements);
    
    // Generate image via Excalidraw helper if available
    let screenshotUrl = "";
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png"
      });
      const reader = new FileReader();
      screenshotUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Screenshot export failed:", e);
    }

    const res = await saveSystemDesignDraft(interview.id, explanation, canvasStr, screenshotUrl);
    setIsSaving(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Draft saved successfully!");
      lastSavedStateRef.current = canvasStr;
    }
  };

  // Create version checkpoint
  const handleSaveVersion = async () => {
    if (!excalidrawAPI) return;
    setIsCreatingVersion(true);
    const elements = excalidrawAPI.getSceneElements();
    const canvasStr = JSON.stringify(elements);

    let screenshotUrl = "";
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png"
      });
      const reader = new FileReader();
      screenshotUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Screenshot export failed:", e);
    }

    const res = await createSystemDesignVersion(interview.id, canvasStr, screenshotUrl);
    setIsCreatingVersion(false);
    if (res.error) {
      toast.error(res.error);
    } else if (res.version) {
      setVersions([res.version as any, ...versions]);
      toast.success(`Created Version ${res.version.versionNumber} checkpoint!`);
    }
  };

  // Restore version checkpoint
  const handleRestoreVersion = (ver: Version) => {
    if (!excalidrawAPI) return;
    try {
      const parsed = JSON.parse(ver.canvasState);
      const elements = Array.isArray(parsed) ? parsed : parsed.elements || [];
      excalidrawAPI.updateScene({ elements });
      toast.success(`Restored to Version ${ver.versionNumber}!`);
    } catch (e) {
      toast.error("Failed to restore version snapshot.");
    }
  };

  // Export diagram options
  const handleExportDiagram = async (type: "png" | "svg" | "excalidraw") => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();

    try {
      const { exportToBlob, exportToSvg, serializeAsJSON } = await import("@excalidraw/excalidraw");
      
      if (type === "excalidraw") {
        const jsonStr = serializeAsJSON(elements, excalidrawAPI.getAppState(), excalidrawAPI.getFiles(), "local");
        const blob = new Blob([jsonStr], { type: "application/json" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${interview.technology.toLowerCase()}_system_design.excalidraw`;
        link.click();
        toast.success("Exported Excalidraw JSON file!");
      } else if (type === "svg") {
        const svg = await exportToSvg({
          elements,
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles()
        });
        const svgStr = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgStr], { type: "image/svg+xml" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${interview.technology.toLowerCase()}_system_design.svg`;
        link.click();
        toast.success("Exported SVG diagram!");
      } else if (type === "png") {
        const blob = await exportToBlob({
          elements,
          appState: excalidrawAPI.getAppState(),
          files: excalidrawAPI.getFiles(),
          mimeType: "image/png"
        });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${interview.technology.toLowerCase()}_system_design.png`;
        link.click();
        toast.success("Exported PNG image!");
      }
    } catch (e) {
      console.error("Export failed:", e);
      toast.error("Failed to export diagram.");
    }
  };

  // Submit System Design for AI evaluation
  const handleSubmitDesign = async () => {
    if (!excalidrawAPI) return;
    if (!explanation.trim()) {
      toast.error("Please write an architectural explanation in the workspace panel first.");
      return;
    }

    const elements = excalidrawAPI.getSceneElements();
    const canvasStr = JSON.stringify(elements);

    // Format shapes list and connectivity summary for Gemini ingestion
    const containers = elements.filter((el: any) => ["rectangle", "ellipse", "diamond"].includes(el.type));
    const labels = elements.filter((el: any) => el.type === "text").reduce((acc: Record<string, string>, curr: any) => {
      if (curr.containerId) acc[curr.containerId] = curr.text;
      return acc;
    }, {});

    const shapeDescriptions = containers.map((c: any) => {
      const name = labels[c.id] || c.type;
      return `- ${name} (${c.type.toUpperCase()})`;
    }).join("\n");

    const arrows = elements.filter((el: any) => el.type === "arrow");
    const connectionDescriptions = arrows.map((a: any) => {
      const sourceId = a.startBinding?.elementId;
      const targetId = a.endBinding?.elementId;
      const source = sourceId ? (labels[sourceId] || "Unknown source") : "Unlinked source";
      const target = targetId ? (labels[targetId] || "Unknown target") : "Unlinked target";
      return `- ${source} ➔ ${target}`;
    }).join("\n");

    const shapesMetadata = `[SHAPES/COMPONENTS]:\n${shapeDescriptions || "No components added"}\n\n[CONNECTIONS/FLOWS]:\n${connectionDescriptions || "No connections/arrows added"}`;

    // Export screenshot DataURL for database reference
    let screenshotUrl = "";
    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const blob = await exportToBlob({
        elements,
        appState: excalidrawAPI.getAppState(),
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png"
      });
      const reader = new FileReader();
      screenshotUrl = await new Promise((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn("Screenshot export failed:", e);
    }

    startTransition(async () => {
      toast.loading("AI Coach is auditing your system design diagram...", { id: "eval" });
      const res = await submitSystemDesignEvaluation(
        interview.id,
        explanation,
        canvasStr,
        shapesMetadata,
        screenshotUrl
      );
      toast.dismiss("eval");

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("System design evaluation completed!");
        router.push(`/system-design-interview/${interview.id}/results`);
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0b0f19] text-foreground select-none">
      {/* Top Header Section */}
      <header className="h-14 border-b border-border/40 bg-[#0d1324]/80 backdrop-blur-md px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/mock-interview")}
            className="p-1.5 rounded-lg border border-border/50 bg-black/10 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="h-4 w-4 text-primary" />
              <span>System Design: {interview.technology}</span>
            </h1>
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              {interview.difficulty} Role
            </p>
          </div>
        </div>

        {/* Layout Translucent Toggle Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStencils(!showStencils)}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              showStencils 
                ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30" 
                : "bg-black/20 border-border/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Cpu className="h-3.5 w-3.5" />
            <span>{showStencils ? "Hide Stencils" : "Show Stencils"}</span>
          </button>
          
          <button
            onClick={() => setShowWorkspace(!showWorkspace)}
            className={cn(
              "px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
              showWorkspace 
                ? "bg-primary/20 border-primary/40 text-primary hover:bg-primary/30" 
                : "bg-black/20 border-border/50 text-muted-foreground hover:bg-muted"
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>{showWorkspace ? "Hide Workspace" : "Show Workspace"}</span>
          </button>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-card border border-border/60 text-xs font-bold text-muted-foreground">
          <TimerIcon className="h-3.5 w-3.5 text-primary animate-pulse" />
          <span>{formatTime(secondsElapsed)}</span>
        </div>
      </header>

      {/* Main Workspace split panel */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Whiteboard Section */}
        <div className={cn(
          "h-1/2 md:h-full border-r border-border/40 flex flex-col relative", 
          showWorkspace ? "w-full md:w-3/5" : "w-full"
        )}>
          
          {/* Custom Component Stencils Sidebar Drawer */}
          {showStencils && (
            <aside className="absolute left-3 top-3 bottom-3 w-56 bg-[#0d1324]/95 border border-border/50 backdrop-blur-xl rounded-2xl z-30 p-3 overflow-y-auto hidden md:flex flex-col gap-4 shadow-2xl custom-scrollbar">
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <Cpu className="h-4 w-4 text-primary" />
                <span className="text-xs font-extrabold tracking-wider uppercase bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                  Stencil Library
                </span>
              </div>

              <div className="space-y-4">
                {COMPONENT_LIBRARY.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <div key={cat.category} className="space-y-1.5">
                      <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                        <CatIcon className="h-3 w-3 text-primary/70" />
                        <span>{cat.category}</span>
                      </h3>
                      <div className="grid grid-cols-1 gap-1">
                        {cat.items.map((item) => (
                          <button
                            key={item.label}
                            onClick={() => handleAddComponent(item.label, item.shape)}
                            className="w-full text-left px-2.5 py-1.5 rounded-lg border border-border/40 bg-card/40 hover:bg-primary/10 hover:border-primary/30 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer truncate"
                            title={`Click to add ${item.label}`}
                          >
                            + {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>
          )}

          {/* Whiteboard Controls Overlay */}
          <div className="absolute right-3 top-3 z-30 flex flex-col gap-1.5">
            <button
              onClick={handleAutoLayout}
              className="px-3 py-1.5 rounded-xl border border-border/60 bg-[#0d1324]/90 backdrop-blur-md text-[11px] font-bold text-primary hover:bg-primary hover:text-primary-foreground shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
              title="Auto align shapes cleanly"
            >
              <AlignLeft className="h-3.5 w-3.5" />
              Arrange Diagram
            </button>
            <button
              onClick={toggleGrid}
              className="px-3 py-1.5 rounded-xl border border-border/60 bg-[#0d1324]/90 backdrop-blur-md text-[11px] font-bold text-muted-foreground hover:text-foreground shadow-lg flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings className="h-3.5 w-3.5" />
              {gridEnabled ? "Disable Grid" : "Enable Grid"}
            </button>

            {/* Export Menu */}
            <div className="bg-[#0d1324]/95 border border-border/50 rounded-xl p-1.5 flex flex-col gap-1 shadow-lg">
              <span className="text-[9px] font-extrabold text-muted-foreground uppercase px-2 mb-1">Export Diagram</span>
              <div className="flex gap-1">
                {["png", "svg", "excalidraw"].map((ext) => (
                  <button
                    key={ext}
                    onClick={() => handleExportDiagram(ext as any)}
                    className="px-2 py-1 rounded-lg bg-card border border-border/60 text-[9px] font-bold hover:bg-primary hover:text-primary-foreground cursor-pointer uppercase transition-all"
                  >
                    {ext === "excalidraw" ? "excal" : ext}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Excalidraw Actual Container */}
          <div className="flex-1 w-full h-full relative">
            <Excalidraw
              excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
              theme="dark"
              gridModeEnabled={gridEnabled}
              zenModeEnabled={false}
              viewModeEnabled={false}
            />
          </div>
        </div>

        {/* Right Workspace Section */}
        {showWorkspace && (
          <div className="w-full md:w-2/5 h-1/2 md:h-full flex flex-col bg-[#0d1324] border-t md:border-t-0 border-border/40 overflow-hidden">
            
            {/* Question Banner */}
            <div className="p-4 border-b border-border/40 bg-card/30">
              <span className="text-[10px] font-bold text-primary tracking-widest uppercase mb-1 block">
                Interview Question
              </span>
              <h2 className="text-sm md:text-base font-extrabold text-foreground leading-snug">
                {interview.question}
              </h2>
            </div>

            {/* Tabs header */}
            <div className="h-10 border-b border-border/40 bg-black/10 flex items-center justify-between px-4 shrink-0">
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab("explanation")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold transition-all relative cursor-pointer",
                    activeTab === "explanation" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Written Explanation
                  {activeTab === "explanation" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold transition-all relative cursor-pointer",
                    activeTab === "history" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Version History ({versions.length})
                  {activeTab === "history" && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>
              <button
                onClick={handleSaveVersion}
                disabled={isCreatingVersion}
                className="text-[10px] font-bold px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer disabled:opacity-50"
              >
                {isCreatingVersion ? "Snapshotting..." : "+ Save Checkpoint"}
              </button>
            </div>

            {/* Tab content workspace */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === "explanation" ? (
                <div className="h-full flex flex-col gap-2">
                  <label className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider block">
                    Detail your architectural choices (databases, caching, sharding, flows):
                  </label>
                  <textarea
                    value={explanation}
                    onChange={(e) => setExplanation(e.target.value)}
                    placeholder="Describe your design choices. Explain how your components scale, how high availability is guaranteed, your API designs, sharding structures, caching layers, and how they handle bottlenecks..."
                    className="flex-1 w-full bg-black/30 border border-border/50 rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-primary/80 transition-all font-mono resize-none custom-scrollbar min-h-[180px] text-foreground placeholder:text-muted-foreground/50"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                    <History className="h-3.5 w-3.5 text-primary" />
                    <span>Select a version to restore elements to canvas:</span>
                  </div>
                  
                  {versions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-8 text-center bg-black/10 rounded-xl border border-border/30">
                      No version snapshots saved. Click "+ Save Checkpoint" above to record progress.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((ver) => (
                        <div 
                          key={ver.id}
                          className="p-3 rounded-xl border border-border/50 bg-card/40 hover:bg-card flex items-center justify-between gap-3 group transition-all"
                        >
                          <div>
                            <p className="text-xs font-bold text-foreground">Version {ver.versionNumber}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {ver.createdAt.toLocaleTimeString()} · {ver.createdAt.toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => handleRestoreVersion(ver)}
                            className="px-2.5 py-1 rounded-lg border border-primary/20 bg-primary/10 text-primary text-[10px] font-bold opacity-0 group-hover:opacity-100 hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Footer Actions Panel */}
      <footer className="h-16 border-t border-border/40 bg-[#0d1324]/90 backdrop-blur-md px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDraft}
            disabled={isSaving || isPending}
            className="px-4 py-2 rounded-xl border border-border/60 bg-black/20 hover:bg-muted text-xs font-bold text-foreground transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Draft
          </button>
        </div>

        <button
          onClick={handleSubmitDesign}
          disabled={isPending || isSaving}
          className="px-5 py-2.5 rounded-xl gradient-bg hover:opacity-90 text-xs font-extrabold text-white transition-all flex items-center gap-1.5 shadow-lg shadow-primary/25 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          {isPending ? "Evaluating Design..." : "Submit Design"}
        </button>
      </footer>
    </div>
  );
}
