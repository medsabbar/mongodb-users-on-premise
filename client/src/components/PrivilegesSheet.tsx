import { useEffect, useState } from "react";
import {
  DialogCloseButton,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Sheet,
  SheetHeader,
  SheetTitle,
} from "./ui";
import { fetchJson } from "../utils/api";
import type { ApiUser } from "../types/api";

interface Privilege {
  resource?: Record<string, unknown>;
  actions?: string[];
}

interface EffectivePrivilegesResponse {
  privileges?: Privilege[];
}

interface PrivilegesSheetProps {
  user: ApiUser | null;
  onClose?: () => void;
}

export function PrivilegesSheet({ user, onClose }: PrivilegesSheetProps) {
  const [data, setData] = useState<EffectivePrivilegesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const currentUser = user;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const name = (currentUser.name || '').replace(/^admin\./, '');
        const res = await fetchJson<EffectivePrivilegesResponse>(
          `/users/${encodeURIComponent(name)}/effective-privileges`
        );
        setData(res);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load privileges';
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [user]);

  if (!user) return null;

  const displayName = (user.name || "").replace(/^admin\./, "");

  return (
    <Sheet open={!!user} onOpenChange={(open) => !open && onClose?.()}>
      <SheetHeader>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Effective privileges
          </p>
          <SheetTitle>{displayName}</SheetTitle>
        </div>
        <DialogCloseButton onClick={onClose} />
      </SheetHeader>
      <div className="px-4 pt-2 pb-4 text-xs">
        <DialogDescription>
          Expanded view of the effective privileges returned by MongoDB for this
          principal.
        </DialogDescription>
        <div className="mt-3 max-h-[calc(100vh-140px)] space-y-3 overflow-y-auto pr-1">
          {loading && <p className="text-slate-500">Loading privileges…</p>}
          {error && (
            <p className="text-rose-300">Failed to load privileges: {error}</p>
          )}
          {!loading && !error && (!data || !data.privileges?.length) && (
            <p className="text-slate-500">
              No explicit privileges returned. Access may still be inherited
              from roles.
            </p>
          )}
          {!loading &&
            !error &&
            Array.isArray(data?.privileges) &&
            data.privileges.length > 0 && (
              <div className="space-y-3">
                {data.privileges.map((p, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                  >
                    <p className="text-[11px] text-slate-500">Resource</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-900">
                      {JSON.stringify(p.resource || {}, null, 0)}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-500">Actions</p>
                    <p className="mt-1 font-mono text-[11px] text-emerald-700">
                      {(p.actions || []).join(", ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
        </div>
      </div>
    </Sheet>
  );
}

