export interface PostHogClient {
  capture: (event: string, props?: Record<string, string | number>) => void;
  identify: (id: string, props?: Record<string, string>) => void;
  opt_out_capturing: () => void;
  getFeatureFlag: (key: string) => string | boolean | undefined;
  onFeatureFlags: (callback: () => void) => void;
  reloadFeatureFlags: () => void;
}

let posthogClient: PostHogClient | null = null;

export function getPosthog(): PostHogClient | null {
  if (typeof window === "undefined") return null;
  return posthogClient;
}

export async function initPosthog(): Promise<PostHogClient | null> {
  if (typeof window === "undefined") return null;
  if (posthogClient) return posthogClient;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!key) return null;

  const mod = await import("posthog-js");
  const posthog = mod.default || mod;
  posthog.init(key, {
    api_host: host,
    capture_pageview: true,
    autocapture: true,
    disable_session_recording: true,
    loaded: (ph: PostHogClient) => {
      if (process.env.NODE_ENV === "development") ph.opt_out_capturing();
    },
  });

  posthogClient = posthog;
  return posthogClient;
}
