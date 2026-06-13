"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeProjectId = searchParams.get("projectId") || projects[0]?.id;
  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];

  const handleSelect = (id: string) => {
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
        router.push(`/dashboard?projectId=${project._id}`);
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
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            id="project_selector_trigger"
            variant="secondary"
            size="sm"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 text-sm font-semibold hover:bg-slate-800/80 hover:border-slate-700 transition-all duration-150 cursor-pointer"
          >
            <span className="truncate max-w-[150px]">
              {activeProject ? activeProject.name : "Select Project..."}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent id="project_selector_dropdown" align="start" className="w-56">
          <div className="max-h-60 overflow-y-auto p-1">
            {projects.length === 0 ? (
              <div className="px-3 py-2 text-xs text-slate-500 italic">No projects found</div>
            ) : (
              projects.map(p => (
                <DropdownMenuItem
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-slate-800/60 transition-colors text-left cursor-pointer ${
                    p.id === activeProject?.id ? "text-indigo-400 font-medium" : "text-slate-300"
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.id === activeProject?.id && <Check className="w-4 h-4 text-indigo-400" />}
                </DropdownMenuItem>
              ))
            )}
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            id="create_project_trigger"
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-indigo-400 hover:text-indigo-300 hover:bg-slate-800/60 rounded-lg transition-colors text-left cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Create New Project
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Project</DialogTitle>
            <DialogDescription>
              Projects group services, API keys, and logs together.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateProject}>
            <div className="space-y-4 my-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Acme Corp Production"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                id="create_project_submit"
                type="submit"
                size="sm"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
