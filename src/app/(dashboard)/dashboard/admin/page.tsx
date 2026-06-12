"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-client";
import type { UserPublic } from "@/lib/types";

export default function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", role: "user" });

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" /></div>;
  if (!isAuthenticated) return null;

  const load = async () => {
    try {
      const data = await api.listUsers();
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    await api.register(createForm);
    setShowCreate(false);
    setCreateForm({ email: "", password: "", role: "user" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa người dùng này?")) return;
    await api.deleteUser(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Quản lý người dùng</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Hủy" : "Thêm người dùng"}
        </button>
      </div>

      {showCreate && (
        <div className="p-4 border rounded-lg space-y-3 max-w-md bg-white">
          <label className="block">
            <span className="text-sm font-medium">Email:</span>
            <input className="mt-1 block w-full px-3 py-2 border rounded-md" value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} type="email" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password:</span>
            <input className="mt-1 block w-full px-3 py-2 border rounded-md" value={createForm.password}
              onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} type="password" />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Role:</span>
            <select className="mt-1 block w-full px-3 py-2 border rounded-md" value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
              <option value="user">user</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={handleCreate}>Tạo</button>
        </div>
      )}

      <div className="border rounded-lg bg-white">
        {loading ? (
          <p className="p-4 text-gray-500">Đang tải...</p>
        ) : users.length === 0 ? (
          <p className="p-4 text-gray-500">Không có người dùng</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-3 text-left font-medium">Email</th>
                <th className="p-3 text-left font-medium">Role</th>
                <th className="p-3 text-left font-medium">Face</th>
                <th className="p-3 text-left font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-gray-100 text-gray-800"
                    }`}>{u.role}</span>
                  </td>
                  <td className="p-3">
                    {u.has_face ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                        Đã xác thực
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                        Chưa xác thực
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <button className="text-red-600 text-sm hover:underline"
                      onClick={() => handleDelete(u.id)}>Xóa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}