"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { initPosthog, getPosthog, type PostHogClient } from "@/lib/posthog";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initPosthog();
  }, []);

  useEffect(() => {
    const ph = getPosthog();
    if (ph) {
      (ph as PostHogClient).capture("$pageview", {
        $current_url: window.location.href,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}
