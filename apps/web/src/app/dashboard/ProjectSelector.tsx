"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";

interface SerializedProject {
  id: string;
  name: string;
  apiKey: string;
}

interface ProjectSelectorProps {
  projects: SerializedProject[];
}

export default function ProjectSelector({ projects }: ProjectSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProjectId = searchParams.get("projectId") || projects[0]?.id;
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    setIsOpen(false);
    const params = new URLSearchParams(window.location.search);
    params.set("projectId", id);
    router.push(`/dashboard?${params.toString()}`);
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim() }),
      });
      if (res.ok) {
        const { project } = await res.json();
        setNewProjectName("");
        setIsModalOpen(false);
        // Direct route to new project
        router.push(`/dashboard?projectId=${project._id}`);
        // Refresh page data
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error?.message || "Failed to create project");
      }
    } catch (e) {
      console.error(e);
      alert("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        id="project_selector_trigger"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-sm font-semibold hover:bg-slate-800/80 hover:border-slate-700 transition-all duration-150 cursor-pointer"
      >
        <span className="truncate max-w-[150px]">
          {activeProject ? activeProject.name : "Select Project..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          id="project_selector_dropdown"
          className="absolute left-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-1 z-50 backdrop-blur-md bg-opacity-95"
        >
          <div className="max-h-60 overflow-y-auto">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 italic">No projects found</div>
            ) : (
              projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-800/60 transition-colors text-left ${
                    p.id === activeProject?.id ? "text-indigo-400 font-medium" : "text-slate-300"
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.id === activeProject?.id && <Check className="w-4 h-4 text-indigo-400" />}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-slate-800 my-1" />

          <button
            id="create_project_trigger"
            onClick={() => {
              setIsOpen(false);
              setIsModalOpen(true);
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded-lg transition-colors text-left"
          >
            <Plus className="w-3.5 h-3.5" />
            Create New Project
          </button>
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <h3 className="text-lg font-bold text-white mb-1">Create Project</h3>
            <p className="text-xs text-slate-400 mb-6">
              Projects group services, API keys, and logs together.
            </p>

            <form onSubmit={handleCreateProject}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="projectName" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Project Name
                  </label>
                  <input
                    id="projectName"
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Acme Corp Production"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="create_project_submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
