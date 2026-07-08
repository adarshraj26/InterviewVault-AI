"use client";

import { useState, useRef, useCallback, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, RotateCw, ZoomIn, ZoomOut, Check, Loader2, Camera } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { setCustomProfileImage } from "@/actions/user";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PhotoUploadCropProps {
  isOpen: boolean;
  onClose: () => void;
  onUploaded: (url: string) => void;
}

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
const OUTPUT_SIZE = 400; // px — final cropped image dimensions

export function PhotoUploadCrop({ isOpen, onClose, onUploaded }: PhotoUploadCropProps) {
  const [isDragging, setIsDragging]       = useState(false);
  const [rawImage, setRawImage]           = useState<string | null>(null);  // data URL of original
  const [zoom, setZoom]                   = useState(1);
  const [rotation, setRotation]           = useState(0);
  const [offset, setOffset]               = useState({ x: 0, y: 0 });
  const [isDraggingImg, setIsDraggingImg] = useState(false);
  const [dragStart, setDragStart]         = useState({ x: 0, y: 0 });
  const [isUploading, setIsUploading]     = useState(false);
  const [isPending, startTransition]      = useTransition();

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  const { startUpload } = useUploadThing("profileImage", {
    onUploadError: (err) => {
      setIsUploading(false);
      toast.error(`Upload failed: ${err.message}`);
    },
  });

  // ── File validation ───────────────────────────────────────────
  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return "Only PNG, JPG, JPEG, and WEBP are supported";
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) return `File must be under ${MAX_FILE_SIZE_MB} MB`;
    return null;
  };

  const loadFile = (file: File) => {
    const err = validateFile(file);
    if (err) { toast.error(err); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      setRawImage(e.target?.result as string);
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  };

  // ── Drop zone events ──────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  }, []);

  // ── Canvas-based crop preview ─────────────────────────────────
  const drawPreview = useCallback(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !rawImage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const size = OUTPUT_SIZE;
      canvas.width  = size;
      canvas.height = size;

      ctx.clearRect(0, 0, size, size);

      // Clip to circle
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.clip();

      // Transform: center, rotate, zoom, offset
      ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);

      const drawW = img.width  * (size / Math.max(img.width, img.height));
      const drawH = img.height * (size / Math.max(img.width, img.height));
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };
    img.src = rawImage;
  }, [rawImage, zoom, rotation, offset]);

  // ── Image drag for positioning ────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingImg(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingImg) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDraggingImg(false);

  // Touch support
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setIsDraggingImg(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingImg) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  // ── Crop & upload ─────────────────────────────────────────────
  const handleSave = async () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !rawImage) return;

    // Draw one final time to make sure it's up to date
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d")!;
        const size = OUTPUT_SIZE;
        canvas.width  = size;
        canvas.height = size;
        ctx.clearRect(0, 0, size, size);
        ctx.save();
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(size / 2 + offset.x, size / 2 + offset.y);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.scale(zoom, zoom);
        const drawW = img.width  * (size / Math.max(img.width, img.height));
        const drawH = img.height * (size / Math.max(img.width, img.height));
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();
        resolve();
      };
      img.src = rawImage;
    });

    // Convert canvas to Blob then to File
    canvas.toBlob(async (blob) => {
      if (!blob) { toast.error("Failed to process image"); return; }

      const file = new File([blob], "profile.jpg", { type: "image/jpeg" });
      setIsUploading(true);

      try {
        const result = await startUpload([file]);
        if (!result || !result[0]) { toast.error("Upload failed"); setIsUploading(false); return; }

        const url = result[0].ufsUrl;

        startTransition(async () => {
          const res = await setCustomProfileImage(url);
          setIsUploading(false);
          if (res.error) { toast.error(res.error); return; }
          toast.success("Profile photo updated!");
          onUploaded(url);
          onClose();
        });
      } catch (e) {
        setIsUploading(false);
        toast.error("Upload failed. Please try again.");
      }
    }, "image/jpeg", 0.92);
  };

  const isBusy = isUploading || isPending;

  // Redraw whenever dependencies change
  if (rawImage) drawPreview();

  const handleReset = () => {
    setRawImage(null);
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[300]"
            onClick={!rawImage ? onClose : undefined}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-4 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[520px] bg-card border border-border rounded-2xl shadow-2xl z-[301] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
              <div>
                <h2 className="text-lg font-bold">Upload Photo</h2>
                <p className="text-xs text-muted-foreground">PNG, JPG, JPEG, WEBP · Max 5 MB</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!rawImage ? (
                /* Drop zone */
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all",
                    isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                  )}
                >
                  <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/25">
                    <Camera className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-sm">Drop your photo here</p>
                    <p className="text-xs text-muted-foreground mt-1">or click to browse files</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) loadFile(f); }}
                  />
                </div>
              ) : (
                /* Crop editor */
                <div className="space-y-4">
                  {/* Preview canvas (circular crop) */}
                  <div className="flex flex-col items-center gap-4">
                    <div
                      className="relative w-56 h-56 rounded-full overflow-hidden border-4 border-primary/30 shadow-xl shadow-primary/20 cursor-grab active:cursor-grabbing"
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleMouseUp}
                    >
                      <canvas
                        ref={previewCanvasRef}
                        className="w-full h-full"
                        style={{ touchAction: "none" }}
                      />
                      <div className="absolute inset-0 rounded-full border-2 border-primary/40 pointer-events-none" />
                    </div>
                    <p className="text-xs text-muted-foreground">Drag to reposition</p>
                  </div>

                  {/* Controls */}
                  <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                    {/* Zoom */}
                    <div className="flex items-center gap-3">
                      <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        type="range"
                        min={0.5}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-primary cursor-pointer"
                      />
                      <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-muted-foreground w-10 text-right">{(zoom * 100).toFixed(0)}%</span>
                    </div>

                    {/* Rotation */}
                    <div className="flex items-center gap-3">
                      <RotateCw className="h-4 w-4 text-muted-foreground shrink-0" />
                      <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={rotation}
                        onChange={(e) => setRotation(parseInt(e.target.value))}
                        className="flex-1 accent-primary cursor-pointer"
                      />
                      <span className="text-xs text-muted-foreground w-10 text-right">{rotation}°</span>
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Choose a different photo
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border/50 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-muted hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
              {rawImage && (
                <button
                  onClick={handleSave}
                  disabled={isBusy}
                  className="px-5 py-2 rounded-xl text-sm font-semibold gradient-bg text-white shadow-lg shadow-primary/25 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isBusy ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
                  ) : (
                    <><Check className="h-4 w-4" /> Save Photo</>
                  )}
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
