  "use client";

  import React, { useState, useEffect } from "react";
  import {
    createColumnHelper,
    ColumnDef,
    ColumnFiltersState,
    getCoreRowModel,
    Table as ReactTableType,
    useReactTable,
  } from "@tanstack/react-table";
  import { authClient } from "@/utils/auth-client";

  import { Checkbox } from "@/components/ui/Checkbox";
  import { Badge } from "@/components/ui/Badge";
  import { DataTable } from "@/components/ui/data-table/DataTable";
  import { MoreVerticalIcon } from "lucide-react";
  import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

  /** The user interface from your DB. */
  interface User {
    id: string;
    name: string | null;
    email: string;
    role: string; // e.g. "superAdmin" | "admin" | "user"
    banned: boolean;
    banReason?: string | null;
    banExpires?: number | null;
    emailVerified: boolean;
  }

  /** Edit Role Modal. Uses admin.setRole to change user role. */
  function EditRoleModal({
    user,
    onClose,
    onSaved,
  }: {
    user: User;
    onClose: () => void;
    onSaved: () => void;
  }) {
    const [role, setRole] = useState(user.role);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      try {
        await authClient.admin.setRole({ userId: user.id, role });
        onClose();
        onSaved();
      } catch (err) {
        console.error("Error setting role:", err);
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-sm rounded bg-white p-4 shadow-lg">
          <h2 className="mb-2 text-xl font-semibold">Change Role</h2>
          <form onSubmit={handleSubmit}>
            <label className="mt-2 block text-sm font-medium">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            >
              <option value="superAdmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="btn-secondary btn-sm">
                Cancel
              </button>
              <button type="submit" className="btn-primary btn-sm">
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  /** Simple modal for banning a user. */
  function BanUserModal({
    userId,
    onClose,
    onBanComplete,
  }: {
    userId: string;
    onClose: () => void;
    onBanComplete: () => void;
  }) {
    const [reason, setReason] = useState("");
    const [expiresIn, setExpiresIn] = useState("");

    async function handleBan() {
      try {
        await authClient.admin.banUser({
          userId,
          banReason: reason || "No reason",
          banExpiresIn: expiresIn ? parseInt(expiresIn, 10) : undefined,
        });
        onClose();
        onBanComplete();
      } catch (err) {
        console.error("Ban user error:", err);
      }
    }

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-sm rounded bg-white p-4 shadow-lg">
          <h2 className="mb-2 text-xl font-semibold">Ban User</h2>
          <label className="block text-sm font-medium">Ban Reason</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
          <label className="mt-2 block text-sm font-medium">Ban Duration (seconds)</label>
          <input
            type="text"
            value={expiresIn}
            onChange={(e) => setExpiresIn(e.target.value)}
            placeholder="Empty = permanent"
            className="mt-1 w-full rounded border p-2"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={onClose} className="btn-secondary btn-sm">
              Cancel
            </button>
            <button onClick={handleBan} className="btn-primary btn-sm">
              Ban
            </button>
          </div>
        </div>
      </div>
    );
  }

  /** Row actions: ban/unban, edit role, delete user, etc. */
  function UserRowActions({
    user,
    onRefresh,
  }: {
    user: User;
    onRefresh: () => void;
  }) {
    const [banOpen, setBanOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    async function unbanUser() {
      try {
        await authClient.admin.unbanUser({ userId: user.id });
        onRefresh();
      } catch (err) {
        console.error("Error unbanning user:", err);
      }
    }

    async function deleteUser() {
      if (!confirm("Are you sure you want to remove this user entirely?")) return;
      try {
        await authClient.admin.removeUser({ userId: user.id });
        onRefresh();
      } catch (err) {
        console.error("Error removing user:", err);
      }
    }

    return (
      <>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="btn btn-sm">
              <MoreVerticalIcon className="h-4 w-4" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-[8rem] rounded border bg-white p-1 shadow"
              align="end"
            >
              {/* Edit Role */}
              <DropdownMenu.Item
                onSelect={() => setEditOpen(true)}
                className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-gray-100"
              >
                Edit Role
              </DropdownMenu.Item>

              {/* Ban or Unban */}
              {user.banned ? (
                <DropdownMenu.Item
                  onSelect={unbanUser}
                  className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-gray-100"
                >
                  Unban
                </DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item
                  onSelect={() => setBanOpen(true)}
                  className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-gray-100"
                >
                  Ban
                </DropdownMenu.Item>
              )}

              {/* Delete */}
              <DropdownMenu.Item
                onSelect={deleteUser}
                className="cursor-pointer rounded px-2 py-1 text-sm text-red-600 hover:bg-gray-100"
              >
                Delete
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        {editOpen && (
          <EditRoleModal
            user={user}
            onClose={() => setEditOpen(false)}
            onSaved={() => {
              setEditOpen(false);
              onRefresh();
            }}
          />
        )}
        {banOpen && (
          <BanUserModal
            userId={user.id}
            onClose={() => setBanOpen(false)}
            onBanComplete={() => {
              setBanOpen(false);
              onRefresh();
            }}
          />
        )}
      </>
    );
  }

  /** Main Admin Dashboard. */
  export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    /** We'll store columnFilters for server-side filtering. */
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

    /** Set up columns with TanStack's column helper. */
    const columnHelper = createColumnHelper<User>();
    const columns: ColumnDef<User>[] = [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected()
                ? true
                : table.getIsSomeRowsSelected()
                ? "indeterminate"
                : false
            }
            onCheckedChange={() => table.toggleAllPageRowsSelected()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={() => row.toggleSelected()}
          />
        ),
        enableSorting: false,
        enableHiding: false,
        meta: { displayName: "Select" },
      }),
      columnHelper.accessor("email", {
        id: "owner",
        header: "Email",
        meta: { displayName: "Email" },
      }),
      columnHelper.accessor("role", {
        id: "role",
        header: "Role",
        meta: { displayName: "Role" },
      }),
      columnHelper.accessor("banned", {
        id: "status",
        header: "Status",
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="error">Banned</Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          ),
        meta: { displayName: "Status" },
      }),
      columnHelper.accessor("emailVerified", {
        header: "Verified",
        cell: (info) =>
          info.getValue() ? (
            <Badge variant="success">Yes</Badge>
          ) : (
            <Badge variant="error">No</Badge>
          ),
        meta: { displayName: "Verified" },
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        meta: { displayName: "Actions" },
        cell: ({ row }) => (
          <UserRowActions user={row.original} onRefresh={fetchUsers} />
        ),
      }),
    ];

    // Build the table instance.
    const table = useReactTable({
      data: users,
      columns,
      state: {
        columnFilters,
      },
      onColumnFiltersChange: setColumnFilters,
      manualFiltering: true,
      getCoreRowModel: getCoreRowModel(),
    });

    // When filters change, re-fetch from server (server-side filtering).
    useEffect(() => {
      fetchUsers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [columnFilters]);

    async function fetchUsers() {
      setLoading(true);
      try {
        const query: any = { limit: 100 };
        const filter: any[] = [];

        for (const cf of columnFilters) {
          if (cf.id === "status") {
            // single select => "true" => banned = true, "false" => banned = false
            if (typeof cf.value === "string" && cf.value !== "") {
              const isBanned = cf.value === "true";
              filter.push({ field: "banned", operator: "eq", value: isBanned });
            }
          } else if (cf.id === "role") {
            // multi checkbox => array
            if (Array.isArray(cf.value) && cf.value.length > 0) {
              filter.push({
                field: "role",
                operator: "in",
                value: cf.value,
              });
            }
          } else if (cf.id === "owner") {
            // searching by email
            if (cf.value && typeof cf.value === "string") {
              query.searchField = "email";
              query.searchOperator = "contains";
              query.searchValue = cf.value;
            }
          }
        }

        if (filter.length > 0) {
          query.filter = filter;
        }

        const res = await authClient.admin.listUsers({ query });
        setUsers(res.data?.users || []);
      } catch (err) {
        console.error("Error listing users:", err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }

    // Initial fetch (no filters)
    useEffect(() => {
      fetchUsers();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) return <div className="p-4">Loading users…</div>;

    return (
      <div className="py-6 container mx-auto">
        <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>

        {/* The DataTable now receives the entire table object. */}
        <DataTable table={table} />
      </div>
    );
  }
