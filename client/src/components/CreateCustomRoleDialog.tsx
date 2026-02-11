import { useState, useEffect, useMemo, type FormEvent, type ReactElement } from "react";
import { ChevronDown, ChevronRight, Plus, Search, X, Info } from "lucide-react";
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
import type { ActionsTreeNode } from "../types/api";

interface CreateCustomRoleDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: () => void;
  onError?: (message: string) => void;
}

type LeafTypeMap = Record<string, "action" | "role">;

interface Target {
  id: number;
  db: string;
  collection: string;
  anyDb: boolean;
  anyCollection: boolean;
}

interface RowState {
  id: number;
  selectedNames: string[];
  searchQuery: string;
  isDropdownOpen: boolean;
  expandedPaths: string[];
  targets: Target[];
}

function collectLeafNames(
  node: ActionsTreeNode | undefined,
  out: string[] = [],
): string[] {
  if (!node) return out;
  const { children } = node;
  if (!children || children.length === 0) {
    out.push(node.name);
    return out;
  }
  children.forEach((c) => collectLeafNames(c, out));
  return out;
}

function filterTree(
  nodes: ActionsTreeNode[] | null,
  query: string,
): ActionsTreeNode[] | null {
  if (!nodes) return null;
  if (!query || !query.trim()) return nodes;
  const q = query.trim().toLowerCase();
  function keep(node: ActionsTreeNode): ActionsTreeNode | null {
    const children = node.children;
    if (!children || children.length === 0) {
      return node.name.toLowerCase().includes(q) ? node : null;
    }
    const filtered = children.map(keep).filter(Boolean) as ActionsTreeNode[];
    if (filtered.length > 0) return { ...node, children: filtered };
    return node.name.toLowerCase().includes(q) ? node : null;
  }
  return nodes.map(keep).filter(Boolean) as ActionsTreeNode[];
}

function buildLeafTypeMap(
  nodes: ActionsTreeNode[] | null,
  map: LeafTypeMap = {},
): LeafTypeMap {
  if (!nodes) return map;
  nodes.forEach((node) => {
    const children = node.children;
    if (!children || children.length === 0) {
      map[node.name] = node.type || "action";
      return;
    }
    buildLeafTypeMap(children, map);
  });
  return map;
}

export function CreateCustomRoleDialog({
  open,
  onOpenChange,
  onCreated,
  onError,
}: CreateCustomRoleDialogProps) {
  const [actionsTree, setActionsTree] = useState<ActionsTreeNode[] | null>(
    null,
  );
  const [actionsTreeLoading, setActionsTreeLoading] = useState(false);
  const [actionsTreeError, setActionsTreeError] = useState<string | null>(null);
  const leafTypeMap = useMemo<LeafTypeMap>(
    () => (actionsTree ? buildLeafTypeMap(actionsTree) : {}),
    [actionsTree],
  );

  const createInitialRow = (): RowState => ({
    id: Date.now(),
    selectedNames: [],
    searchQuery: "",
    isDropdownOpen: false,
    expandedPaths: [],
    targets: [
      {
        id: Date.now() + 1,
        db: "",
        collection: "",
        anyDb: false,
        anyCollection: false,
      },
    ],
  });

  const [roleName, setRoleName] = useState("");
  const [rows, setRows] = useState<RowState[]>([createInitialRow()]);
  const [submitting, setSubmitting] = useState(false);
  const [scopeMode, setScopeMode] = useState<"collection" | "database" | null>(
    null,
  );

  useEffect(() => {
    if (!open) return;
    setActionsTreeError(null);
    setActionsTreeLoading(true);
    fetchJson<ActionsTreeNode[]>("/roles/actions-tree")
      .then((tree) => {
        setActionsTree(Array.isArray(tree) ? tree : []);
      })
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to load actions tree";
        setActionsTreeError(message);
      })
      .finally(() => {
        setActionsTreeLoading(false);
      });
  }, [open]);

  function reset(): void {
    setRoleName("");
    setRows([createInitialRow()]);
    setScopeMode(null);
  }

  function handleClose(): void {
    reset();
    onOpenChange?.(false);
  }

  function addRow(): void {
    setRows((prev) => [...prev, createInitialRow()]);
  }

  function removeRow(index: number): void {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addTarget(rowIndex: number): void {
    setRows((prev) => {
      const newRows = [...prev];
      const row = newRows[rowIndex];
      row.targets.push({
        id: Date.now(),
        db: "",
        collection: "",
        anyDb: false,
        anyCollection: false,
      });
      return newRows;
    });
  }

  function removeTarget(rowIndex: number, targetIndex: number): void {
    setRows((prev) => {
      const newRows = [...prev];
      newRows[rowIndex].targets = newRows[rowIndex].targets.filter(
        (_, i) => i !== targetIndex,
      );
      return newRows;
    });
  }

  function toggleName(rowIndex: number, name: string): void {
    setRows((prevRows) =>
      prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const has = row.selectedNames.includes(name);
        return {
          ...row,
          selectedNames: has
            ? row.selectedNames.filter((n) => n !== name)
            : [...row.selectedNames, name],
        };
      }),
    );
  }

  function togglePathExpanded(rowIndex: number, path: string): void {
    setRows((prevRows) =>
      prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const has = row.expandedPaths.includes(path);
        return {
          ...row,
          expandedPaths: has
            ? row.expandedPaths.filter((p) => p !== path)
            : [...row.expandedPaths, path],
        };
      }),
    );
  }

  function toggleNodeSelection(rowIndex: number, node: ActionsTreeNode): void {
    const names = collectLeafNames(node);
    if (!names.length) return;
    setRows((prevRows) =>
      prevRows.map((row, idx) => {
        if (idx !== rowIndex) return row;
        const allSelected = names.every((n) => row.selectedNames.includes(n));
        if (allSelected) {
          return {
            ...row,
            selectedNames: row.selectedNames.filter((n) => !names.includes(n)),
          };
        }
        const add = names.filter((n) => !row.selectedNames.includes(n));
        return {
          ...row,
          selectedNames: [...row.selectedNames, ...add],
        };
      }),
    );
  }

  type InheritedRolePayload = { role: string; db?: string };

  async function handleSubmit(ev: FormEvent<HTMLFormElement>): Promise<void> {
    ev.preventDefault();
    if (!roleName.trim()) {
      onError?.("Role name is required");
      return;
    }

    const privileges: Array<{
      resource: { db: string; collection?: string };
      actions: string[];
    }> = [];
    const inheritedRolesPayload: InheritedRolePayload[] = [];
    for (const row of rows) {
      const actions = (row.selectedNames || []).filter(
        (n) => leafTypeMap[n] === "action",
      );
      const roles = (row.selectedNames || []).filter(
        (n) => leafTypeMap[n] === "role",
      );
      const rowTargets = row.targets && row.targets.length > 0 ? row.targets : [];

      // Map built-in role selections to databases based on the row's targets.
      // This ensures "database roles" are actually scoped to the databases
      // the user associated them with, instead of always defaulting to "admin".
      for (const roleName of roles) {
        if (rowTargets.length === 0) {
          inheritedRolesPayload.push({ role: roleName });
          continue;
        }
        for (const target of rowTargets) {
          const db = target.anyDb ? "" : target.db.trim();
          inheritedRolesPayload.push({ role: roleName, db: db || undefined });
        }
      }
      if (actions.length === 0) continue;

      if (!scopeMode) {
        onError?.(
          "Select a privilege scope (Collection Actions or Database Actions and Roles) before adding actions.",
        );
        return;
      }

      for (const target of row.targets) {
        if (scopeMode === "database") {
          const db = target.anyDb ? "" : target.db.trim();
          if (!target.anyDb && !db) {
            onError?.(
              "For database actions, specify a database name or enable \"Apply to any database\".",
            );
            return;
          }
          // Database-scoped privileges always target the whole database
          // (all collections), so we force an empty collection string.
          const resource = { db, collection: "" };
          privileges.push({ resource, actions });
        } else if (scopeMode === "collection") {
          const db = target.db.trim();
          if (!db) {
            onError?.(
              "For collection actions, a specific database is required.",
            );
            return;
          }
          if (target.anyDb) {
            onError?.(
              "Collection actions cannot use \"Apply to any database\". Choose a specific database.",
            );
            return;
          }
          const collection = target.anyCollection
            ? ""
            : target.collection.trim();
          if (!target.anyCollection && !collection) {
            onError?.(
              "For collection actions, specify a collection name or enable \"Apply to any collection\".",
            );
            return;
          }
          const resource = { db, collection };
          privileges.push({ resource, actions });
        }
      }
    }
    const seenInherited = new Set<string>();
    const inheritedRoles = inheritedRolesPayload.filter(({ role, db }) => {
      const key = `${role}@@${db || ""}`;
      if (seenInherited.has(key)) return false;
      seenInherited.add(key);
      return true;
    });

    if (privileges.length === 0 && inheritedRoles.length === 0) {
      onError?.("Add at least one action or inherited role");
      return;
    }

    setSubmitting(true);
    try {
      await fetchJson("/roles/custom", {
        method: "POST",
        body: JSON.stringify({
          roleName: roleName.trim(),
          privileges,
          inheritedRoles,
        }),
      });
      reset();
      onCreated?.();
      onOpenChange?.(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create custom role";
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && handleClose()}
      className="w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex max-h-[80vh] flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <DialogTitle>Add Custom Role</DialogTitle>
          </div>
          <DialogCloseButton onClick={handleClose} />
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-2 pt-1 pb-2 space-y-2">
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
            <Info className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <span className="font-bold">
                Some actions require all clusters in a project to run a minimum
                version of MongoDB.{" "}
              </span>
              <a href="#" className="text-emerald-700 hover:underline">
                More information
              </a>
            </div>
          </div>

          <DialogDescription className="text-slate-600">
            Name your custom role and associate its actions and roles with
            databases and collections.
          </DialogDescription>

          <CardContent className="space-y-3 px-0 text-xs text-slate-700">
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wider text-slate-600">
                Custom Role Name
              </label>
              <Input
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                placeholder="e.g. databaseManager"
                className="h-8"
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2">
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                  Privilege scope
                </p>
                <p className="text-[11px] text-slate-500">
                  Choose whether this custom role is defined at the database
                  level or at the collection level. You cannot mix both in a
                  single role.
                </p>
              </div>
              <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 text-[11px] font-medium text-slate-700 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setScopeMode("collection")}
                  className={`px-2.5 py-1.5 border-r border-slate-200 ${
                    scopeMode === "collection"
                      ? "bg-emerald-600 text-white"
                      : "hover:bg-slate-100"
                  }`}
                >
                  Collection Actions
                </button>
                <button
                  type="button"
                  onClick={() => setScopeMode("database")}
                  className={`px-2.5 py-1.5 ${
                    scopeMode === "database"
                      ? "bg-emerald-600 text-white"
                      : "hover:bg-slate-100"
                  }`}
                >
                  Database Actions &amp; Roles
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-600">
                    <th className="px-2 py-2 min-w-[280px]">Action or Role</th>
                    <th className="px-2 py-2 w-6 text-center text-slate-600">
                      @
                    </th>
                    <th className="px-2 py-2" colSpan={2}>
                      Resource (Database &amp; Collection)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {rows.map((row, rowIndex) => (
                    <tr
                      key={row.id}
                      className="align-top hover:bg-slate-100"
                    >
                      <td className="px-2 py-2">
                        <div className="relative">
                          <div
                            onClick={() => {
                              const newRows = [...rows];
                              newRows[rowIndex].isDropdownOpen =
                                !newRows[rowIndex].isDropdownOpen;
                              setRows(newRows);
                            }}
                            className="flex min-h-[32px] items-center justify-between rounded border border-slate-300 bg-white px-2 py-0.5 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex flex-wrap gap-1">
                              {row.selectedNames.length === 0 ? (
                                <span className="text-slate-500">
                                  Select actions or roles
                                </span>
                              ) : (
                                row.selectedNames.map((name) => (
                                  <span
                                    key={name}
                                    className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-800"
                                  >
                                    {name}
                                    <X
                                      className="h-2.5 w-2.5 cursor-pointer hover:text-rose-400"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleName(rowIndex, name);
                                      }}
                                    />
                                  </span>
                                ))
                              )}
                            </div>
                            <ChevronDown
                              className={`h-4 w-4 text-slate-500 transition-transform ${row.isDropdownOpen ? "rotate-180" : ""}`}
                            />
                          </div>

                          {row.isDropdownOpen && (
                            <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 bg-white shadow-xl">
                              <div className="p-1.5 border-b border-slate-200">
                                <div className="relative">
                                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                                  <input
                                    className="w-full bg-white rounded border border-slate-300 py-1.5 pl-8 pr-3 text-[11px] focus:outline-none focus:border-emerald-500/50"
                                    placeholder="Search"
                                    value={row.searchQuery || ""}
                                    onChange={(e) => {
                                      const newRows = [...rows];
                                      newRows[rowIndex].searchQuery =
                                        e.target.value;
                                      setRows(newRows);
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="max-h-60 overflow-y-auto p-0.5 text-[11px]">
                                {actionsTreeLoading && (
                                  <p className="py-2 text-slate-500">
                                    Loading…
                                  </p>
                                )}
                                {actionsTreeError && (
                                  <p className="py-2 text-rose-600">
                                    {actionsTreeError}
                                  </p>
                                )}
                                {!actionsTreeLoading &&
                                  !actionsTreeError &&
                                  actionsTree &&
                                  actionsTree.length > 0 &&
                                  (() => {
                                    if (!scopeMode) {
                                      return (
                                        <div className="py-2 text-[11px] text-slate-500">
                                          Select a privilege scope above to see
                                          available actions and roles.
                                        </div>
                                      );
                                    }

                                    let sourceTree: ActionsTreeNode[] = [];
                                    if (scopeMode === "collection") {
                                      sourceTree =
                                        actionsTree.filter(
                                          (n) =>
                                            n.name === "Collection Actions",
                                        ) || [];
                                    } else if (scopeMode === "database") {
                                      sourceTree =
                                        actionsTree.filter(
                                          (n) =>
                                            n.name ===
                                            "Database Actions and Roles",
                                        ) || [];
                                    }

                                    const tree = filterTree(
                                      sourceTree,
                                      row.searchQuery || "",
                                    );
                                    const expandedPaths =
                                      row.expandedPaths || [];
                                    function renderNodes(
                                      nodes: ActionsTreeNode[],
                                      pathPrefix: string,
                                    ): ReactElement[] {
                                      return nodes.map((node) => {
                                        const path = pathPrefix
                                          ? `${pathPrefix}>${node.name}`
                                          : node.name;
                                        const children = node.children;
                                        const hasChildren =
                                          !!children && children.length > 0;
                                        const isExpanded =
                                          expandedPaths.includes(path);

                                        if (hasChildren && children) {
                                          const leafNames =
                                            collectLeafNames(node);
                                          const allSelected =
                                            leafNames.length > 0 &&
                                            leafNames.every((n) =>
                                              row.selectedNames.includes(n),
                                            );
                                          return (
                                            <div key={path} className="mb-0.5">
                                              <div className="flex items-center gap-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                                <button
                                                  type="button"
                                                  onClick={() =>
                                                    togglePathExpanded(
                                                      rowIndex,
                                                      path,
                                                    )
                                                  }
                                                  className="flex shrink-0 items-center justify-center p-0.5 text-slate-500 hover:text-slate-800"
                                                  aria-label={
                                                    isExpanded
                                                      ? "Collapse"
                                                      : "Expand"
                                                  }
                                                >
                                                  {isExpanded ? (
                                                    <ChevronDown className="h-3.5 w-3.5" />
                                                  ) : (
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                  )}
                                                </button>
                                                <input
                                                  type="checkbox"
                                                  checked={allSelected}
                                                  onChange={() =>
                                                    toggleNodeSelection(
                                                      rowIndex,
                                                      node,
                                                    )
                                                  }
                                                  onClick={(e) =>
                                                    e.stopPropagation()
                                                  }
                                                  className="h-3 w-3 shrink-0 rounded border-slate-300 bg-white text-emerald-600 focus:ring-0 focus:ring-offset-0"
                                                />
                                                <span className="truncate">
                                                  {node.name}
                                                </span>
                                              </div>
                                              {isExpanded && (
                                                <div className="pl-3">
                                                  {renderNodes(children, path)}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        }
                                        return (
                                          <label
                                            key={path}
                                            className="flex items-center gap-2 py-0.5 pl-1.5 pr-1.5 rounded cursor-pointer group transition-colors hover:bg-slate-100"
                                          >
                                            <input
                                              type="checkbox"
                                              checked={row.selectedNames.includes(
                                                node.name,
                                              )}
                                              onChange={() =>
                                                toggleName(rowIndex, node.name)
                                              }
                                              className="h-3.5 w-3.5 shrink-0 rounded border-slate-300 bg-white text-emerald-600 focus:ring-0 focus:ring-offset-0"
                                            />
                                            <span className="text-[12px] text-slate-800 group-hover:text-slate-900 transition-colors">
                                              {node.name}
                                            </span>
                                          </label>
                                        );
                                      });
                                    }
                                    if (!tree || tree.length === 0) {
                                      return (
                                        <div className="py-2 text-slate-500 italic">
                                          No matches
                                        </div>
                                      );
                                    }
                                    return renderNodes(tree, "");
                                  })()}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <span className="text-slate-600 text-base">@</span>
                      </td>
                      <td colSpan={2} className="px-0 py-0">
                        <div className="divide-y divide-slate-200">
                          {row.targets.map((target, tIndex) => (
                            <div
                              key={target.id}
                              className="flex items-start gap-2 px-2 py-2 group"
                            >
                              <div className="flex-1 space-y-1">
                                <Input
                                  placeholder="Enter a database name"
                                  value={target.db}
                                  disabled={
                                    scopeMode === "database" && target.anyDb
                                  }
                                  onChange={(e) => {
                                    const newRows = [...rows];
                                    newRows[rowIndex].targets[tIndex].db =
                                      e.target.value;
                                    setRows(newRows);
                                  }}
                                  className="h-8"
                                />
                                {scopeMode === "database" && (
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={target.anyDb}
                                      onChange={(e) => {
                                        const newRows = [...rows];
                                        newRows[rowIndex].targets[
                                          tIndex
                                        ].anyDb = e.target.checked;
                                        setRows(newRows);
                                      }}
                                      className="h-3 w-3 rounded border-slate-300 bg-white text-emerald-600 focus:ring-0"
                                    />
                                    <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                      Apply to any database
                                    </span>
                                  </label>
                                )}
                              </div>
                              <div className="flex-1 space-y-1">
                                <Input
                                  placeholder="Enter a collection name"
                                  value={target.collection}
                                  disabled={target.anyCollection}
                                  onChange={(e) => {
                                    const newRows = [...rows];
                                    newRows[rowIndex].targets[
                                      tIndex
                                    ].collection = e.target.value;
                                    setRows(newRows);
                                  }}
                                  className="h-8"
                                />
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={target.anyCollection}
                                    onChange={(e) => {
                                      const newRows = [...rows];
                                      newRows[rowIndex].targets[
                                        tIndex
                                      ].anyCollection = e.target.checked;
                                      setRows(newRows);
                                    }}
                                    className="h-3 w-3 rounded border-slate-300 bg-white text-emerald-600 focus:ring-0"
                                  />
                                  <span className="text-[10px] text-slate-500 uppercase tracking-tighter">
                                    Apply to any collection
                                  </span>
                                </label>
                              </div>
                              <div>
                                {row.targets.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeTarget(rowIndex, tIndex)
                                    }
                                    className="text-slate-600 hover:text-rose-400 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                          <div className="px-3 py-1.5 bg-emerald-50/40">
                            <button
                              type="button"
                              onClick={() => addTarget(rowIndex)}
                              className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              Add a database or collection
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-slate-200 bg-slate-100 px-3 py-2">
                <button
                  type="button"
                  onClick={addRow}
                  className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add an action or role
                </button>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(rows.length - 1)}
                    className="ml-4 text-[11px] text-slate-500 hover:text-rose-600"
                  >
                    Remove last row
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </div>

        <DialogFooter className="px-4 pb-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={handleClose}
            className="rounded px-4 h-8"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={submitting}
            className="rounded px-4 h-8 bg-emerald-600 hover:bg-emerald-500"
          >
            {submitting ? "Adding..." : "Add Custom Role"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
