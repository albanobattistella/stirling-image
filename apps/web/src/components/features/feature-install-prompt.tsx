import type { FeatureBundleState } from "@ashim/shared";
import { AlertCircle, Download, Loader2, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api";
import { useFeaturesStore } from "@/stores/features-store";

interface FeatureInstallPromptProps {
  bundle: FeatureBundleState;
  isAdmin: boolean;
}

interface ProgressState {
  percent: number;
  stage: string;
}

export function FeatureInstallPrompt({ bundle, isAdmin }: FeatureInstallPromptProps) {
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refresh = useFeaturesStore((s) => s.refresh);

  // If bundle is already installing on mount, show progress state immediately
  useEffect(() => {
    if (bundle.status === "installing") {
      setInstalling(true);
      setProgress(bundle.progress ?? { percent: 0, stage: "Installing..." });
    }
  }, [bundle.status, bundle.progress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  function startPollingFallback() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        await refresh();
        const updated = useFeaturesStore.getState().bundles.find((b) => b.id === bundle.id);
        if (!updated || updated.status !== "installing") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          setInstalling(false);
          if (updated?.status === "error") {
            setError(updated.error ?? "Installation failed");
          } else {
            setProgress(null);
          }
        } else if (updated.progress) {
          setProgress(updated.progress);
        }
      } catch {
        // ignore polling errors
      }
    }, 3000);
  }

  function listenToProgress(jobId: string) {
    const es = new EventSource(`/api/v1/jobs/${jobId}/progress`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          phase: string;
          percent: number;
          stage: string;
          error?: string;
        };

        if (data.phase === "complete") {
          es.close();
          eventSourceRef.current = null;
          setInstalling(false);
          setProgress(null);
          refresh();
          return;
        }

        if (data.phase === "failed") {
          es.close();
          eventSourceRef.current = null;
          setInstalling(false);
          setError(data.error ?? "Installation failed");
          return;
        }

        setProgress({ percent: data.percent, stage: data.stage });
      } catch {
        // ignore malformed messages
      }
    };

    es.onerror = () => {
      es.close();
      eventSourceRef.current = null;
      startPollingFallback();
    };
  }

  async function handleInstall() {
    setInstalling(true);
    setError(null);
    setProgress({ percent: 0, stage: "Starting installation..." });

    try {
      const result = await apiPost<{ jobId: string }>(`/v1/admin/features/${bundle.id}/install`);
      listenToProgress(result.jobId);
    } catch (err) {
      setInstalling(false);
      setError(err instanceof Error ? err.message : "Failed to start installation");
    }
  }

  // Non-admin: show "not enabled" message
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <Download className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold text-foreground">Feature Not Enabled</h2>
        <p className="text-muted-foreground max-w-md">
          This feature is not enabled. Ask your administrator to enable it in Settings.
        </p>
      </div>
    );
  }

  // Admin: show install prompt
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-4">
      <Download className="h-16 w-16 text-muted-foreground" />
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground">{bundle.name}</h2>
        <p className="text-muted-foreground max-w-md">{bundle.description}</p>
        <p className="text-sm text-muted-foreground">
          This feature requires an additional download (~{bundle.estimatedSize})
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg px-4 py-3 max-w-md w-full">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm flex-1 text-left">{error}</span>
          <button
            type="button"
            onClick={handleInstall}
            className="flex items-center gap-1 text-sm font-medium hover:opacity-80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Progress bar */}
      {installing && progress && (
        <div className="w-full max-w-md space-y-2">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{progress.stage}</span>
          </div>
        </div>
      )}

      {/* Install button (hidden when installing or showing error) */}
      {!installing && !error && (
        <button
          type="button"
          onClick={handleInstall}
          disabled={installing || bundle.status === "installing"}
          className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
        >
          Enable {bundle.name}
        </button>
      )}
    </div>
  );
}
