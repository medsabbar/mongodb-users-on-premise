import { useState } from "react";
import { KeyRound, Copy } from "lucide-react";
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
import type { ApiUser } from "../types/api";

interface UserPasswordDialogProps {
  user: ApiUser | null;
  onClose: () => void;
  onChanged?: () => void;
  onError?: (message: string) => void;
}

export function UserPasswordDialog({
  user,
  onClose,
  onChanged,
  onError,
}: UserPasswordDialogProps) {
  const open = !!user;
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const displayName = (user?.name || "").replace(/^admin\./, "");

  function resetState() {
    setPassword("");
    setSubmitting(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  async function handleSubmit() {
    if (!user) return;
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      onError?.("Password is required");
      return;
    }

    if (!/^[A-Za-z0-9]+$/.test(trimmedPassword)) {
      onError?.(
        "Password may only contain letters and numbers (no special characters).",
      );
      return;
    }

    setSubmitting(true);
    try {
      await fetchJson("/users/password", {
        method: "PUT",
        body: JSON.stringify({
          id: user._id,
          password: trimmedPassword,
        }),
      });
      onChanged?.();
      handleClose();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update password";
      onError?.(message);
    } finally {
      setSubmitting(false);
    }
  }

  function generatePassword() {
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
        const idx = Math.floor(Math.random() * charset.length);
        result += charset[idx] ?? "";
      }
    }
    setPassword(result);
  }

  async function copyPassword() {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
    } catch {
      onError?.("Failed to copy password to clipboard");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogHeader>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Change password
          </p>
          <DialogTitle>
            Change password for {displayName || "this user"}
          </DialogTitle>
        </div>
        <DialogCloseButton onClick={handleClose} />
      </DialogHeader>
      <DialogDescription className="text-slate-600">
        Update the user&apos;s password without changing their roles or other
        attributes.
      </DialogDescription>
      <CardContent className="mt-3 space-y-4 text-xs text-slate-700">
        <div className="space-y-1">
          <label className="block text-[11px] font-medium uppercase tracking-wide text-slate-600">
            New password
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
              onClick={generatePassword}
            >
              <KeyRound className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="xs"
              variant="outline"
              disabled={!password}
              onClick={copyPassword}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Generate a strong password and copy it for your application.
          </p>
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
          {submitting ? "Updating…" : "Update password"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

