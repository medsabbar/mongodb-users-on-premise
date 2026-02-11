import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, Settings, KeyRound, Copy } from "lucide-react";
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
import type { CustomRoleSummary } from "../types/api";

interface GroupedBuiltinRoles {
  global?: Array<{ role: string; description: string }>;
  [key: string]: Array<{ role: string; description: string }> | undefined;
}

interface UserCreateDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
  onError?: (message: string) => void;
}

export function UserCreateDialog({
  open,
  onOpenChange,
  onCreated,
  onError,
}: UserCreateDialogProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isTemporary, setIsTemporary] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [groupedBuiltinRoles, setGroupedBuiltinRoles] =
    useState<GroupedBuiltinRoles | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRoleSummary[] | null>(
    null,
  );
  const [selectedDefaultRole, setSelectedDefaultRole] = useState("");
  const [selectedCustomRoles, setSelectedCustomRoles] = useState<string[]>([]);
  const [customExpanded, setCustomExpanded] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  function resetState() {
    setName("");
    setPassword("");
    setIsTemporary(false);
    setExpiresAt("");
    setSelectedDefaultRole("");
    setSelectedCustomRoles([]);
    setCustomExpanded(true);
  }

  function handleClose() {
    resetState();
    onOpenChange?.(false);
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
    if (!name.trim() || !password.trim()) {
      onError?.("Name and password are required");
      return;
    }

    const trimmedName = name.trim();
    const trimmedPassword = password.trim();

    if (!/^[A-Za-z0-9]+$/.test(trimmedPassword)) {
      onError?.("Password may only contain letters and numbers (no special characters).");
      return;
    }

    let expiresInHours: number | null = null;
    if (isTemporary) {
      if (!expiresAt) {
        onError?.("Expiry date/time is required");
        return;
      }
      const target = new Date(expiresAt);
      if (Number.isNaN(target.getTime())) {
        onError?.("Expiry must be a valid date and time");
        return;
      }
      const diffMs = target.getTime() - Date.now();
      if (diffMs <= 0) {
        onError?.("Expiry must be in the future");
        return;
      }
      expiresInHours = diffMs / (1000 * 60 * 60);
    }

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
      if (isTemporary && expiresInHours) {
        await fetchJson("/users/temporary", {
          method: "POST",
          body: JSON.stringify({
            name: trimmedName,
            password: trimmedPassword,
            expiresInHours,
            ...(roles ? { roles } : {}),
          }),
        });
      } else {
        await fetchJson("/users", {
          method: "POST",
          body: JSON.stringify({
            name: trimmedName,
            password: trimmedPassword,
            ...(roles ? { roles } : {}),
          }),
        });
      }
      resetState();
      onCreated?.();
      onOpenChange?.(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create user";
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogHeader>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Create user
          </p>
          <DialogTitle>Create MongoDB user</DialogTitle>
        </div>
        <DialogCloseButton onClick={handleClose} />
      </DialogHeader>
      <DialogDescription className="text-slate-600">
        Provision a permanent or temporary MongoDB user from a single, unified
        form. Optionally attach roles from this deployment.
      </DialogDescription>
      <CardContent className="mt-3 space-y-4 text-xs text-slate-700">
        {/* Account */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Account
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                Username
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. analytics-app"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-600">
                Password
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Strong password"
                  className="flex-1"
                />
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    const charset =
                      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
                    const length = 20;
                    let result = "";
                    const array = new Uint32Array(length);
                    if (window.crypto && window.crypto.getRandomValues) {
                      window.crypto.getRandomValues(array);
                      for (let i = 0; i < length; i++) {
                        result += charset[array[i] % charset.length] ?? "";
                      }
                    } else {
                      for (let i = 0; i < length; i++) {
                        const idx = Math.floor(
                          Math.random() * charset.length,
                        );
                        result += charset[idx] ?? "";
                      }
                    }
                    setPassword(result);
                  }}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  disabled={!password}
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(password);
                    } catch {
                      onError?.("Failed to copy password to clipboard");
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[11px] text-slate-500">
                Generate a strong password and copy it for your application.
              </p>
            </div>
          </div>
        </div>

        {/* Access window */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Access window
          </p>
          <div className="flex items-center gap-2">
            <input
              id="user-is-temporary"
              type="checkbox"
              checked={isTemporary}
              onChange={(e) => setIsTemporary(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 bg-white text-emerald-600 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
            />
            <label
              htmlFor="user-is-temporary"
              className="text-xs text-slate-800"
            >
              Temporary access
              <span className="ml-1 text-[11px] text-slate-500">
                (auto-expiring user with cleanup)
              </span>
            </label>
          </div>
          {isTemporary && (
            <div className="mt-2 max-w-xs space-y-1">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-600">
            Expires at
          </label>
          <Input
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <p className="text-[11px] text-slate-500">
            Local time, converted to a temporary access window.
          </p>
        </div>
          )}
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
            <div className="max-h-80 overflow-y-auto space-y-3">
              {/* Default built-in role (single-select) */}
              <div className="border border-slate-200 rounded-lg bg-white">
                <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
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
                <div className="p-3 space-y-2">
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
                        className="flex items-center gap-2 rounded px-2 py-1 cursor-pointer hover:bg-slate-100"
                      >
                        <input
                          type="radio"
                          name="default-role"
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
                <div className="border border-slate-200 rounded-lg bg-white">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
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
                      <Settings className="w-4 h-4 text-slate-500" />
                      <span className="text-xs font-medium text-slate-800">
                        Custom roles
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={toggleCustomExpansion}
                      className="text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      {customExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  {customExpanded && (
                    <div className="p-3 pt-0 space-y-2">
                      {customRoles.map((role) => (
                        <label
                          key={role.role}
                          className="flex items-center gap-2 pl-4 pr-2 py-1 rounded cursor-pointer hover:bg-slate-100"
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
          {submitting
            ? "Creating…"
            : isTemporary
              ? "Create temporary user"
              : "Create user"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
