import { useCallback, useState, type ReactElement } from "react";
import { ShieldCheck, Users as UsersIcon } from "lucide-react";
import { Header, Main, PageShell, Shell, Toast, Dialog } from "./components/ui";
import { useDashboardData } from "./hooks/useDashboardData";
import { ConnectionPanel } from "./components/ConnectionPanel";
import { UsersSection } from "./components/UsersSection";
import { CreateCustomRoleDialog } from "./components/CreateCustomRoleDialog";
import type { CustomRoleSummary, ToastState } from "./types/api";
import { RolesSection } from "./components/RolesSection";

type ActiveTab = "users" | "roles";

function App(): ReactElement {
  const { config, users, stats, loading, error, reload } = useDashboardData();
  const [activeTab, setActiveTab] = useState<ActiveTab>("users");
  const [toast, setToast] = useState<ToastState | null>(null);
  const [lastReload, setLastReload] = useState<Date | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRoleSummary[] | null>(
    null,
  );
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [createRoleOpen, setCreateRoleOpen] = useState(false);

  const isConnected = !!config?.isConnected || !!config?.demoMode;

  function surfaceError(msg: string): void {
    setToast({ message: msg, tone: "error" });
  }

  function surfaceSuccess(msg: string): void {
    setToast({ message: msg, tone: "success" });
  }

  const loadRoles = useCallback(async (): Promise<void> => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const response = await fetch("/roles/custom");
      if (!response.ok) {
        throw new Error(`Failed to load roles: ${response.status}`);
      }
      const json = (await response.json()) as { roles?: CustomRoleSummary[] };
      setCustomRoles(json.roles || []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load roles";
      setRolesError(message);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  async function handleDisconnect(): Promise<void> {
    try {
      const res = await fetch("/disconnect", { method: "POST" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(data?.error || `Disconnect failed with ${res.status}`);
      }
      surfaceSuccess("Disconnected from MongoDB.");
      await reload();
      setLastReload(new Date());
      setActiveTab("users");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to disconnect";
      surfaceError(message);
    }
  }

  return (
    <Shell>
      {toast && (
        <Toast
          message={toast.message}
          tone={toast.tone}
          onClear={() => setToast(null)}
        />
      )}
      <Header
        isConnected={isConnected}
        demoMode={config?.demoMode ?? false}
        serverName={config?.serverName ?? null}
        onDisconnect={isConnected ? handleDisconnect : undefined}
      />
      <PageShell>
        <Main>
          {/* Top tab navigation */}
          <div className="mb-4 border-b border-slate-200">
            <nav className="flex gap-6 text-xs font-medium text-slate-500">
              {[
                { id: "users" as ActiveTab, label: "Users", icon: UsersIcon },
                { id: "roles" as ActiveTab, label: "Roles", icon: ShieldCheck },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={
                      (isActive
                        ? "border-emerald-500 text-slate-900"
                        : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300") +
                      " relative -mb-px inline-flex items-center gap-1 border-b-2 pb-2 transition-colors"
                    }
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Connection panel is only visible when not connected */}
          {!isConnected && (
            <div className="mt-6 flex justify-center">
              <div className="w-full max-w-xl">
                <ConnectionPanel
                  config={config}
                  onConnected={async () => {
                    surfaceSuccess("Connected to MongoDB successfully.");
                    await reload();
                    setLastReload(new Date());
                  }}
                  onError={surfaceError}
                />
              </div>
            </div>
          )}

          {isConnected && (
            <section className="mt-3">
              {error && (
                <div className="mb-3 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                  {error}
                </div>
              )}
              {loading && (
                <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs text-slate-400">
                  Loading users from MongoDB…
                </div>
              )}
              {!loading && activeTab === "users" && (
                <UsersSection
                  users={users}
                  stats={stats}
                  reload={reload}
                  onError={surfaceError}
                />
              )}
            {!loading && activeTab === "roles" && (
              <RolesSection
                roles={customRoles}
                loading={rolesLoading}
                error={rolesError}
                onRefresh={loadRoles}
                onCreateRole={() => setCreateRoleOpen(true)}
                onError={surfaceError}
                onDeleted={(name) => {
                  surfaceSuccess(`Custom role "${name}" deleted.`);
                  void loadRoles();
                }}
              />
            )}

            <CreateCustomRoleDialog
              open={createRoleOpen}
              onOpenChange={setCreateRoleOpen}
              onCreated={loadRoles}
              onError={surfaceError}
            />
          </section>
          )}
        </Main>
      </PageShell>
      {/* Keep Dialog import live to ensure types are bundled; actual dialogs are in components */}
      <Dialog open={false} onOpenChange={() => undefined}>
        <span className="sr-only">Hidden</span>
      </Dialog>
    </Shell>
  );
}

export default App;
