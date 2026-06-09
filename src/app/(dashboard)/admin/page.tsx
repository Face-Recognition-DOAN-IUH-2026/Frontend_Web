"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Trash2, Users } from "lucide-react";
import api from "@/lib/api-client";
import type { UserPublic } from "@/lib/types";

export default function AdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") {
      setError("Access denied. Admin only.");
      setIsLoading(false);
      return;
    }
    loadUsers();
  }, [user]);

  const loadUsers = async () => {
    try {
      const response = await api.listUsers();
      setUsers(response.users);
    } catch (err: any) {
      setError(err.message || "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    setDeletingId(userId);
    try {
      await api.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete user");
    } finally {
      setDeletingId(null);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          Access denied. This page is for administrators only.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8" />
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">
                  Role
                </th>
                <th className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">{u.email}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      disabled={deletingId === u.id || u.id === user.id}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-md disabled:opacity-50"
                      title="Delete user"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">No users found.</div>
          )}
        </div>
      )}
    </div>
  );
}