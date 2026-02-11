import { useState, type ReactElement } from 'react';
import { DatabaseZap, PlugZap, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './button';

interface HeaderProps {
  isConnected: boolean;
  demoMode: boolean;
  serverName?: string | null;
  onDisconnect?: () => void;
}

export function Header({
  isConnected,
  demoMode,
  serverName,
  onDisconnect,
}: HeaderProps): ReactElement {
  const [showServerName, setShowServerName] = useState(false);
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 ring-1 ring-emerald-400/50">
            <DatabaseZap className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-600">
              Mongo Users Studio
            </h1>
            <p className="text-xs text-slate-500">
              Opinionated control panel for MongoDB users &amp; roles
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {demoMode && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Demo mode
            </span>
          )}
          <div className="flex flex-col items-end gap-1">
            {isConnected && serverName && showServerName && (
              <span className="max-w-xs truncate text-[11px] text-slate-500">
                {serverName}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 ring-1",
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-300"
                    : "bg-rose-50 text-rose-700 ring-rose-300",
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isConnected ? "bg-emerald-500" : "bg-rose-500",
                  )}
                />
                <PlugZap className="h-3.5 w-3.5" />
                {isConnected ? "Connected" : "Disconnected"}
              </span>
              {isConnected && serverName && (
                <button
                  type="button"
                  onClick={() => setShowServerName((prev) => !prev)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-800"
                  aria-label={showServerName ? "Hide server name" : "Show server name"}
                  title={showServerName ? "Hide server name" : "Show server name"}
                >
                  {showServerName ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
              {isConnected && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={onDisconnect}
                >
                  Disconnect
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

