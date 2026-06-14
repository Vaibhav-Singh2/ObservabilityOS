"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export default function ZeroStateView() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: projectName.trim() }),
      });
      if (res.ok) {
        const { project, plainApiKey } = await res.json();
        setProjectName("");
        router.push(`/dashboard/onboarding?projectId=${project._id}&apiKey=${plainApiKey}`);
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
    <div className="max-w-2xl mx-auto py-12 flex flex-col items-center">
      {/* Visual Badge/Icon */}
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/10 animate-bounce">
        <Activity className="w-8 h-8 text-indigo-400" />
      </div>

      <div className="text-center mb-10">
        <h2 className="text-2xl font-extrabold text-white tracking-tight mb-2">
          Create your first project
        </h2>
        <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          Projects group your microservices, API credentials, and log ingestion
          streams. Let&apos;s name your first project.
        </p>
      </div>

      {/* Creation card */}
      <Card className="w-full relative overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-500/5 to-transparent pointer-events-none" />
        <CardContent className="p-8">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="zeroProjectName">Project Name</Label>
              <Input
                id="zeroProjectName"
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Acme Backend Production"
                className="px-4 py-3"
              />
            </div>

            <Button
              id="zero_create_project_btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-850 text-white font-semibold h-11 rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-600/10 hover:shadow-indigo-500/20"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting
                ? "Creating Project..."
                : "Create Project & Generate API Key"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Onboarding steps preview */}
      <div className="mt-12 grid grid-cols-3 gap-6 text-center text-xs text-slate-500 w-full max-w-lg">
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-semibold text-slate-400 mb-2">
            1
          </div>
          <span>Create Project</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-semibold text-slate-400 mb-2">
            2
          </div>
          <span>Copy API Key</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-semibold text-slate-400 mb-2">
            3
          </div>
          <span>Ship Logs via SDK</span>
        </div>
      </div>
    </div>
  );
}
