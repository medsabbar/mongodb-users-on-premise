import type { ReactElement } from "react";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardTitle,
  Table,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "./ui";
import type { ApiUser } from "../types/api";

interface UsersTableProps {
  users: ApiUser[];
  onDelete: (user: ApiUser) => void;
  onInspect: (user: ApiUser) => void;
}

export function UsersTable({
  users,
  onDelete,
  onInspect,
}: UsersTableProps): ReactElement {
  if (!users.length) {
    return (
      <Card className="border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center">
        <CardTitle>No users found for this database</CardTitle>
        <CardDescription className="mt-1">
          Create a user to bootstrap access, or switch to demo mode to see a
          realistic dataset.
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHead className="bg-slate-50">
          <TableRow>
            <TableHeaderCell className="pl-4">User</TableHeaderCell>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Expires</TableHeaderCell>
            <TableHeaderCell className="pr-4 text-right">
              Actions
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <tbody>
          {users.map((user, idx) => {
            const isTemp = user.isTemporary;
            const createdLabel =
              user.createdAt && user.createdAt !== "N/A"
                ? new Date(user.createdAt).toLocaleDateString()
                : "—";
            const expiresLabel = user.expiresAt
              ? new Date(user.expiresAt).toLocaleString()
              : isTemp
                ? "Unknown"
                : "—";

            return (
              <TableRow
                key={user._id || user.name || idx}
                className={
                  idx % 2 === 0
                    ? "bg-white hover:bg-slate-50"
                    : "bg-slate-50 hover:bg-slate-100"
                }
              >
                <TableCell className="pl-4 text-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold uppercase text-slate-300 ring-1 ring-slate-700/80">
                      {(user.name || "").replace(/^admin\./, "").slice(0, 2) ||
                        "?"}
                    </span>
                    <span className="font-medium">
                      {user.name || "Unknown"}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="align-middle text-slate-600">
                  {createdLabel}
                </TableCell>
                <TableCell>
                  <Badge variant={isTemp ? "warning" : "default"}>
                    {isTemp ? "Temporary" : "Permanent"}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-600">{expiresLabel}</TableCell>
                <TableCell className="pr-4">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={() => onInspect(user)}
                    >
                      Privileges
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="xs"
                      onClick={() => onDelete(user)}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

