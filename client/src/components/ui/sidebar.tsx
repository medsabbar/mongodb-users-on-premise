import type { ReactElement } from "react";
import { ShieldCheck, Users } from "lucide-react";
import { cn } from "../../lib/utils";

type SidebarItemId = "users" | "roles";

interface SidebarProps {
  active: SidebarItemId;
  onChange: (id: SidebarItemId) => void;
}

const items: Array<{ id: SidebarItemId; label: string; icon: typeof Users }> = [
  { id: "users", label: "Users", icon: Users },
  { id: "roles", label: "Roles", icon: ShieldCheck },
];

export function Sidebar({ active, onChange }: SidebarProps): ReactElement {
  return (
    <nav className="flex flex-col gap-1 px-3 py-4 text-xs">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={cn(
              "flex items-center justify-between rounded-md px-3 py-2 text-left font-medium transition-colors",
              isActive
                ? "bg-emerald-50 text-emerald-900"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <span className="inline-flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-slate-500" />
              <span>{item.label}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

