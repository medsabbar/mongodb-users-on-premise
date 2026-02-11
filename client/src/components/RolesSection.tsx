import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  Table,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableCell,
} from "./ui";
import type { CustomRoleSummary } from "../types/api";
import { fetchJson } from "../utils/api";

interface RolesSectionProps {
  roles: CustomRoleSummary[] | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onCreateRole: () => void;
  onError?: (message: string) => void;
  onDeleted?: (roleName: string) => void;
}

export function RolesSection({
  roles,
  loading,
  error,
  onRefresh,
  onCreateRole,
  onError,
  onDeleted,
}: RolesSectionProps) {
  const [deletingRole, setDeletingRole] = useState<string | null>(null);

  useEffect(() => {
    if (!roles || roles.length === 0) {
      onRefresh();
    }
  }, [roles, onRefresh]);

  async function handleDelete(roleName: string): Promise<void> {
    const confirmed = window.confirm(
      `Delete custom role "${roleName}"?\n\nThis will fail if any users are still assigned this role.`
    );
    if (!confirmed) return;

    setDeletingRole(roleName);
    try {
      await fetchJson(`/roles/custom/${encodeURIComponent(roleName)}`, {
        method: "DELETE",
      });
      onDeleted?.(roleName);
      onRefresh();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to delete custom role";
      onError?.(message);
    } finally {
      setDeletingRole(null);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Roles
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">
              Custom roles
            </h2>
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Roles defined on this deployment.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="default"
          onClick={onCreateRole}
        >
          Create custom role
        </Button>
      </div>

      <Card className="p-3">
        <CardContent className="space-y-2 text-xs text-slate-700">
          {loading && (
            <p className="text-slate-500">Loading custom roles…</p>
          )}
          {error && (
            <p className="text-rose-600">Failed to load roles: {error}</p>
          )}
          {!loading && !error && (
            <>
              {roles && roles.length > 0 ? (
                <Table>
                  <TableHead className="bg-slate-50">
                    <TableRow>
                      <TableHeaderCell>Role</TableHeaderCell>
                      <TableHeaderCell>Privileges</TableHeaderCell>
                      <TableHeaderCell className="w-28 text-right">
                        Actions
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <tbody>
                    {roles.map((role, idx) => (
                      <TableRow
                        key={role.role || idx}
                        className={
                          idx % 2 === 0
                            ? "bg-white hover:bg-slate-50"
                            : "bg-slate-50 hover:bg-slate-100"
                        }
                      >
                        <TableCell className="text-slate-900">
                          {role.role}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {(role.privileges || []).length} privilege
                          {(role.privileges || []).length === 1 ? "" : "s"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            disabled={deletingRole === role.role}
                            onClick={() => handleDelete(role.role)}
                          >
                            {deletingRole === role.role ? "Deleting…" : "Delete"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <p className="text-[11px] text-slate-500">
                  No custom roles defined yet. Create a role to encapsulate a
                  reusable set of privileges.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

