"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Plus, Search, StickyNote, BookOpen, Zap, Trash, Edit, X, Save, Loader2 } from "lucide-react";
import { GlassCard, CustomSelect, ConfirmDeleteButton } from "@/components/shared";
import { cn } from "@/lib/utils";
import { createNote, updateNote, deleteNote } from "@/actions/notes";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const fadeInUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

const noteTypes = [
  { label: "All Notes", value: "all", icon: StickyNote },
  { label: "Interview Notes", value: "INTERVIEW_NOTES", icon: FileText },
  { label: "Cheat Sheets", value: "CHEAT_SHEET", icon: Zap },
  { label: "Quick Revision", value: "QUICK_REVISION", icon: BookOpen },
];

const typeIcons: Record<string, { icon: React.ElementType; color: string }> = {
  INTERVIEW_NOTES: { icon: FileText, color: "from-blue-500 to-cyan-500" },
  CHEAT_SHEET: { icon: Zap, color: "from-amber-500 to-orange-500" },
  QUICK_REVISION: { icon: BookOpen, color: "from-green-500 to-emerald-500" },
};

interface NoteItem {
  id: string;
  title: string;
  content: string;
  type: "INTERVIEW_NOTES" | "CHEAT_SHEET" | "QUICK_REVISION";
  technologyId: string | null;
  updatedAt: Date;
  technology: {
    name: string;
    slug: string;
  } | null;
}

export default function NotesClient({ 
  initialNotes,
  technologies
}: { 
  initialNotes: any[];
  technologies: { id: string; name: string }[];
}) {
  const [notes, setNotes] = useState<NoteItem[]>(initialNotes);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [editorNote, setEditorNote] = useState<Partial<NoteItem> | null>(null);
  const [loading, setLoading] = useState(false);

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchesSearch = note.title.toLowerCase().includes(search.toLowerCase()) || 
                          note.content.toLowerCase().includes(search.toLowerCase()) ||
                          (note.technology?.name.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    if (!matchesSearch) return false;
    if (filter === "all") return true;
    return note.type === filter;
  });

  const handleCreateNew = () => {
    setEditorNote({
      title: "",
      content: "",
      type: "INTERVIEW_NOTES",
      technologyId: technologies[0]?.id || "",
    });
  };

  const handleEdit = (note: NoteItem) => {
    setEditorNote(note);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await deleteNote(id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Note deleted successfully");
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      toast.error("Failed to delete note");
    }
  };

  const handleSave = async () => {
    if (!editorNote?.title?.trim()) {
      toast.warning("Title is required");
      return;
    }
    setLoading(true);
    try {
      if (editorNote.id) {
        // Update
        const res = await updateNote(editorNote.id, {
          title: editorNote.title,
          content: editorNote.content || "",
          type: editorNote.type,
          technologyId: editorNote.technologyId || undefined,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Note updated");
        // Reload locally
        setNotes((prev) => 
          prev.map((n) => (n.id === editorNote.id ? { ...n, ...editorNote, updatedAt: new Date() } as NoteItem : n))
        );
      } else {
        // Create
        const res = await createNote({
          title: editorNote.title,
          content: editorNote.content || "",
          type: editorNote.type || "INTERVIEW_NOTES",
          technologyId: editorNote.technologyId || undefined,
        });

        if (res.error) {
          toast.error(res.error);
          return;
        }

        toast.success("Note created");
        
        // Push to local list (basic mock since DB will load on reload)
        const techObj = technologies.find((t) => t.id === editorNote.technologyId);
        const newNote: NoteItem = {
          id: res.note!.id,
          title: editorNote.title,
          content: editorNote.content || "",
          type: editorNote.type || "INTERVIEW_NOTES",
          technologyId: editorNote.technologyId || null,
          updatedAt: new Date(),
          technology: techObj ? { name: techObj.name, slug: "" } : null,
        };
        setNotes((prev) => [newNote, ...prev]);
      }
      setEditorNote(null);
    } catch (e) {
      toast.error("Failed to save note");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notes</h1>
          <p className="text-muted-foreground mt-1">Your interview notes, cheat sheets, and quick revision cards</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 gradient-bg text-white px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-primary/25 text-sm font-semibold"
        >
          <Plus className="h-4 w-4" />
          Create Note
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {noteTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button 
              key={type.value} 
              onClick={() => setFilter(type.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all", 
                filter === type.value ? "gradient-bg text-white shadow-lg shadow-primary/25" : "glass hover:bg-muted text-muted-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search notes..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-black/10 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent transition-all" 
          />
        </div>
      </div>

      {/* Notes Grid */}
      {filteredNotes.length === 0 ? (
        <GlassCard className="p-8 text-center text-muted-foreground">
          No notes found. Create a new note to get started!
        </GlassCard>
      ) : (
        <motion.div variants={stagger} initial="hidden" animate="visible" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note) => {
            const typeInfo = typeIcons[note.type];
            return (
              <motion.div key={note.id} variants={fadeInUp}>
                <GlassCard hover className="h-full flex flex-col justify-between cursor-pointer" onClick={() => handleEdit(note)}>
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-start gap-3">
                        <div className={cn("p-2 rounded-lg bg-gradient-to-br shadow-md shrink-0", typeInfo.color)}>
                          <typeInfo.icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm truncate leading-snug">{note.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            {note.technology && (
                              <span className="text-[10px] uppercase font-bold text-primary">{note.technology.name}</span>
                            )}
                            {note.technology && <span className="text-xs text-muted-foreground">·</span>}
                            <span className="text-[11px] text-muted-foreground">
                              {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3 mb-4">{note.content}</p>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                    <ConfirmDeleteButton 
                      onDelete={() => handleDelete(note.id)}
                      className="p-1.5 h-8 w-8"
                    />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Editor Modal */}
      <AnimatePresence>
        {editorNote && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }} 
              animate={{ scale: 1 }} 
              exit={{ scale: 0.95 }}
              className="w-full max-w-2xl bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold">{editorNote.id ? "Edit Note" : "Create Note"}</h2>
                <button onClick={() => setEditorNote(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Note Title" 
                  value={editorNote.title || ""} 
                  onChange={(e) => setEditorNote(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full text-lg font-semibold bg-black/20 p-3 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                />

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Note Type</label>
                    <CustomSelect
                      value={editorNote.type || "INTERVIEW_NOTES"}
                      onChange={(val) => setEditorNote(prev => ({ ...prev, type: val as any }))}
                      options={[
                        { value: "INTERVIEW_NOTES", label: "Interview Notes", icon: FileText, color: "text-blue-400" },
                        { value: "CHEAT_SHEET",     label: "Cheat Sheet",     icon: Zap,      color: "text-amber-400" },
                        { value: "QUICK_REVISION",  label: "Quick Revision",  icon: BookOpen,  color: "text-green-400" },
                      ]}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Technology (Optional)</label>
                    <CustomSelect
                      value={editorNote.technologyId || ""}
                      onChange={(val) => setEditorNote(prev => ({ ...prev, technologyId: val }))}
                      placeholder="None"
                      options={[
                        { value: "", label: "None" },
                        ...technologies.map((t) => ({ value: t.id, label: t.name })),
                      ]}
                      className="w-full"
                    />
                  </div>
                </div>

                <textarea
                  placeholder="Start writing notes, cheat sheets, or key concepts..."
                  value={editorNote.content || ""}
                  onChange={(e) => setEditorNote(prev => ({ ...prev, content: e.target.value }))}
                  className="w-full h-72 p-3 bg-black/20 rounded-xl border border-border focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent resize-none text-sm font-medium"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  onClick={() => setEditorNote(null)} 
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-border glass hover:bg-muted text-muted-foreground"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="px-4 py-2 text-sm font-semibold rounded-xl gradient-bg text-white hover:opacity-90 transition-all flex items-center gap-1.5 shadow-lg shadow-primary/25"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Note
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
