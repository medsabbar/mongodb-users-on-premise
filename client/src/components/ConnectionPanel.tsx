import { useEffect, useState, type FormEvent } from "react";
import { Button, Card, CardDescription, CardTitle, Input } from "./ui";
import { fetchJson } from "../utils/api";
import type { ApiConfig } from "../types/api";

interface ConnectionPanelProps {
  config: ApiConfig | null;
  onConnected?: () => void;
  onError?: (message: string) => void;
}

export function ConnectionPanel({
  config,
  onConnected,
  onError,
}: ConnectionPanelProps) {
  const [uri, setUri] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!uri && config?.mongoUriFromEnv) {
      setUri(config.mongoUriFromEnv);
    }
  }, [config, uri]);

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!uri.trim()) {
      onError?.('Please enter a MongoDB URI or type "demo".');
      return;
    }

    setSubmitting(true);
    try {
      await fetchJson("/connect", {
        method: "POST",
        body: JSON.stringify({ uri: uri.trim() }),
      });
      onConnected?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to connect";
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDemo() {
    setUri("demo");
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Connection
          </p>
          <CardTitle className="mt-1">Cluster connection</CardTitle>
          <CardDescription className="mt-1 max-w-xl">
            Paste a standard MongoDB connection string or type{" "}
            <span className="font-mono text-[11px] text-emerald-300">demo</span>{" "}
            to explore the interface with safe sample data.
          </CardDescription>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDemo}
          disabled={submitting}
        >
          Use demo URI
        </Button>
      </div>
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex flex-col gap-3 md:flex-row md:items-end"
      >
        <div className="flex-1">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
            MongoDB URI
          </label>
          <Input
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder='mongodb://user:password@host:27017/admin or "demo"'
            aria-label="MongoDB connection URI"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          size="md"
          className="md:self-auto"
        >
          {submitting ? "Connecting…" : "Connect"}
        </Button>
      </form>
      <div className="mt-3 space-y-1 text-[11px] text-slate-500">
        <p>
          Example:{" "}
          <span className="font-mono text-[11px] text-slate-600">
            mongodb://user:password@localhost:27017/admin
          </span>
        </p>
        <p>
          Credentials stay in memory on this server only. No telemetry, no
          external calls.
        </p>
      </div>
    </Card>
  );
}
