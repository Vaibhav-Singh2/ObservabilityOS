import type { Metadata } from "next";
import Link from "next/link";
import { FileSearch, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "404 — Page Not Found | ObservabilityOS",
  description: "The requested page could not be found on ObservabilityOS.",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="relative w-full max-w-lg bg-slate-900/40 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl text-center">
        <div className="mx-auto w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/5">
          <FileSearch className="w-10 h-10 text-indigo-400" />
        </div>

        <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Page Not Found
        </h1>

        <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Check the URL or head back to the dashboard.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Return Home
          </Link>
        </div>
      </div>
    </div>
  );
}
