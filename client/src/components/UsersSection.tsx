import { useState } from "react";
import { UserPlus } from "lucide-react";
import {
  Button,
  Card,
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  StatCard,
  StatGrid,
} from "./ui";
import { UsersTable } from "./UsersTable";
import { PrivilegesSheet } from "./PrivilegesSheet";
import { UserCreateDialog } from "./UserCreateDialog";
import type { ApiUser, DashboardStats } from "../types/api";
import { fetchJson } from "../utils/api";

interface UsersSectionProps {
  users: ApiUser[];
  stats: DashboardStats;
  reload: () => Promise<void>;
  onError?: (message: string) => void;
}

export function UsersSection({
  users,
  stats,
  reload,
  onError,
}: UsersSectionProps) {
  const [activeUser, setActiveUser] = useState<ApiUser | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiUser | null>(null);
  const [userDialogOpen, setUserDialogOpen] = useState(false);

  function requestDelete(user: ApiUser) {
    if (!user?._id) return;
    setPendingDelete(user);
  }

  async function confirmDelete() {
    if (!pendingDelete?._id) return;
    setDeletingId(pendingDelete._id);
    try {
      await fetchJson('/users/delete', {
        method: 'DELETE',
        body: JSON.stringify({ id: pendingDelete._id })
      });
      await reload();
      setPendingDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      onError?.(message);
    } finally {
      setDeletingId(null);
    }
  }

  const pendingName = (pendingDelete?.name || "").replace(/^admin\./, "");

  return (
    <div className="mt-4 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex-1 space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Users
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Database users
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Review, create, and clean up MongoDB users for the current
                database.
              </p>
            </div>
            <div className="flex items-start justify-end md:justify-center">
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => setUserDialogOpen(true)}
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                Add user
              </Button>
            </div>
          </div>
          <StatGrid>
            <StatCard
              title="Users"
              value={stats.total}
              hint="Total principal accounts in the current database."
              tone="accent"
            />
            <StatCard
              title="Permanent"
              value={stats.permanent}
              hint="Long-lived accounts, ideal for apps and admins."
            />
            <StatCard
              title="Temporary"
              value={stats.temporary}
              hint="Auto-expiring users for short-lived access."
              tone="warning"
            />
          </StatGrid>
          <p className="text-[11px] text-slate-500">
            Deleting privileged or last-remaining users is protected by
            server-side checks. Some delete operations may be rejected by
            design.
          </p>
        </div>
      </div>

      <div className={deletingId ? "opacity-70 transition-opacity" : ""}>
        <UsersTable
          users={users}
          onDelete={requestDelete}
          onInspect={(user) => setActiveUser(user)}
        />
      </div>

      <PrivilegesSheet user={activeUser} onClose={() => setActiveUser(null)} />

      <Dialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <Card className="p-4">
          <DialogHeader className="border-b-0 pb-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Confirm deletion
              </p>
              <DialogTitle>
                Delete user {pendingName || "this user"}?
              </DialogTitle>
            </div>
            <DialogCloseButton onClick={() => setPendingDelete(null)} />
          </DialogHeader>
          <DialogDescription>
            This operation cannot be undone. Some privileged or last-remaining
            users may still be rejected by server-side safety checks.
          </DialogDescription>
          <DialogFooter className="mt-4 border-t border-slate-900 pt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!!deletingId}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!!deletingId}
              onClick={confirmDelete}
            >
              {deletingId ? "Deleting…" : "Delete user"}
            </Button>
          </DialogFooter>
        </Card>
      </Dialog>

      <UserCreateDialog
        open={userDialogOpen}
        onOpenChange={setUserDialogOpen}
        onCreated={reload}
        onError={onError}
      />
    </div>
  );
}

