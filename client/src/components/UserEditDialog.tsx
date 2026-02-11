import { useEffect, useState, type FormEvent } from "react";
import {
  Button,
  CardContent,
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "./ui";
import { fetchJson } from "../utils/api";
import type { ApiUser, ApiUserRole, CustomRoleSummary } from "../types/api";

interface GroupedBuiltinRoles {
  global?: Array<{ role: string; description: string }>;
  [key: string]: Array<{ role: string; description: string }> | undefined;
}

interface UserEditDialogProps {
  user: ApiUser | null;
  onClose: () => void;
  onUpdated?: () => void;
  onError?: (message: string) => void;
}

export function UserEditDialog({
  user,
  onClose,
  onUpdated,
  onError,
}: UserEditDialogProps) {
  const open = !!user;
  const [groupedBuiltinRoles, setGroupedBuiltinRoles] =
    useState<GroupedBuiltinRoles | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRoleSummary[] | null>(
    null,
  );
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [selectedDefaultRole, setSelectedDefaultRole] = useState("");
  const [selectedCustomRoles, setSelectedCustomRoles] = useState<string[]>([]);
  const [customExpanded, setCustomExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Load roles metadata when dialog opens
  useEffect(() => {
    if (!open) return;
    if (groupedBuiltinRoles || customRoles || rolesLoading) return;

    async function loadRoles() {
      setRolesLoading(true);
      setRolesError(null);
      try {
        const [groupedBuiltin, custom] = await Promise.all([
          fetchJson<{ roles?: GroupedBuiltinRoles }>("/roles/builtin/grouped"),
          fetchJson<{ roles?: CustomRoleSummary[] }>("/roles/custom"),
        ]);
        setGroupedBuiltinRoles(groupedBuiltin.roles || {});
        setCustomRoles(custom.roles || []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load roles";
        setRolesError(message);
      } finally {
        setRolesLoading(false);
      }
    }

    void loadRoles();
  }, [open, groupedBuiltinRoles, customRoles, rolesLoading]);

  // Pre-select roles based on the current user
  useEffect(() => {
    if (!open || !user) {
      setSelectedDefaultRole("");
      setSelectedCustomRoles([]);
      return;
    }
    if (!customRoles) return;

    const roles = (user.roles || []) as ApiUserRole[];
    const defaultRole = roles.find((r) =>
      ["clusterAdmin", "readWriteAnyDatabase", "readAnyDatabase"].includes(
        r.role,
      ),
    );
    setSelectedDefaultRole(defaultRole?.role ?? "");

    const customRoleNames = new Set(customRoles.map((r) => r.role));
    const selectedCustom = roles
      .filter((r) => customRoleNames.has(r.role))
      .map((r) => r.role);
    setSelectedCustomRoles(selectedCustom);
  }, [open, user, customRoles]);

  function resetState() {
    setGroupedBuiltinRoles(null);
    setCustomRoles(null);
    setRolesLoading(false);
    setRolesError(null);
    setSelectedDefaultRole("");
    setSelectedCustomRoles([]);
    setCustomExpanded(true);
    setSubmitting(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleCustomRoleToggle(roleName: string, checked: boolean) {
    if (checked) {
      setSelectedCustomRoles((prev) => [...prev, roleName]);
    } else {
      setSelectedCustomRoles((prev) => prev.filter((r) => r !== roleName));
    }
  }

  function handleToggleAllCustom(checked: boolean) {
    if (!Array.isArray(customRoles) || customRoles.length === 0) return;
    if (checked) {
      setSelectedCustomRoles(customRoles.map((r) => r.role));
    } else {
      setSelectedCustomRoles([]);
    }
  }

  function toggleCustomExpansion() {
    setCustomExpanded((prev) => !prev);
  }

  async function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!user) return;

    const roles: Array<{ role: string; db: string }> = [];
    if (selectedDefaultRole) {
      roles.push({ role: selectedDefaultRole, db: "admin" });
    }
    for (const roleName of selectedCustomRoles) {
      roles.push({ role: roleName, db: "admin" });
    }

    if (roles.length === 0) {
      onError?.("At least one role is required");
      return;
    }

    setSubmitting(true);
    try {
      await fetchJson("/users/update", {
        method: "PUT",
        body: JSON.stringify({
          id: user._id,
          roles,
        }),
      });
      onUpdated?.();
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update user";
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  }

  const displayName = (user?.name || "").replace(/^admin\./, "");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogHeader>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Edit user
          </p>
          <DialogTitle>Edit MongoDB user roles</DialogTitle>
        </div>
        <DialogCloseButton onClick={handleClose} />
      </DialogHeader>
      <DialogDescription className="text-slate-600">
        Adjust built-in and custom roles for this user. Username and password
        are managed separately.
      </DialogDescription>
      <CardContent className="mt-3 space-y-4 text-xs text-slate-700">
        {/* Username (read-only) */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Account
          </p>
          <div className="max-w-sm space-y-1">
            <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-600">
              Username
            </label>
            <Input value={displayName} disabled />
            <p className="text-[11px] text-slate-500">
              Username cannot be changed after creation.
            </p>
          </div>
        </div>

        {/* Roles */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Roles
          </p>
          <p className="text-[11px] text-slate-500">
            Assign one built-in default role and optionally attach any number of
            custom roles.
          </p>
          {rolesLoading && (
            <p className="text-[11px] text-slate-500">Loading roles…</p>
          )}
          {rolesError && (
            <p className="text-[11px] text-rose-600">
              Failed to load roles: {rolesError}
            </p>
          )}
          {!rolesLoading && !rolesError && (
            <div className="max-h-80 space-y-3 overflow-y-auto">
              {/* Default built-in role (single-select) */}
              <div className="rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-slate-800">
                      Default role (pick one)
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Cluster-level defaults: clusterAdmin,
                      readWriteAnyDatabase, readAnyDatabase.
                    </span>
                  </div>
                </div>
                <div className="space-y-2 p-3">
                  {(groupedBuiltinRoles?.global || [])
                    .filter((role) =>
                      [
                        "clusterAdmin",
                        "readWriteAnyDatabase",
                        "readAnyDatabase",
                      ].includes(role.role),
                    )
                    .map((role) => (
                      <label
                        key={role.role}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-slate-100"
                      >
                        <input
                          type="radio"
                          name="default-role-edit"
                          value={role.role}
                          checked={selectedDefaultRole === role.role}
                          onChange={() => setSelectedDefaultRole(role.role)}
                          className="h-3.5 w-3.5 border-slate-300 bg-white text-emerald-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                        />
                        <div className="flex-1">
                          <span className="text-xs text-slate-900">
                            {role.role}
                          </span>
                          <p className="text-[10px] text-slate-500">
                            {role.description}
                          </p>
                        </div>
                      </label>
                    ))}
                </div>
              </div>

              {/* Custom Roles (multi-select) */}
              {Array.isArray(customRoles) && customRoles.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          customRoles.length > 0 &&
                          selectedCustomRoles.length === customRoles.length
                        }
                        onChange={(e) =>
                          handleToggleAllCustom(e.target.checked)
                        }
                        className="h-3.5 w-3.5 rounded border-slate-300 bg-white text-emerald-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                      />
                      <span className="text-xs font-medium text-slate-800">
                        Custom roles
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleCustomExpansion}
                      className="text-slate-500 transition-colors hover:text-slate-800"
                    >
                      {customExpanded ? "Hide" : "Show"}
                    </button>
                  </div>
                  {customExpanded && (
                    <div className="space-y-2 p-3 pt-0">
                      {customRoles.map((role) => (
                        <label
                          key={role.role}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 pl-4 hover:bg-slate-100"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCustomRoles.includes(role.role)}
                            onChange={(e) =>
                              handleCustomRoleToggle(
                                role.role,
                                e.target.checked,
                              )
                            }
                            className="h-3.5 w-3.5 rounded border-slate-300 bg-white text-emerald-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                          />
                          <div className="flex-1">
                            <span className="text-xs text-slate-900">
                              {role.role}
                            </span>
                            <p className="text-[10px] text-slate-500">
                              Custom role
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={submitting}
          onClick={handleClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Saving…" : "Save changes"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

