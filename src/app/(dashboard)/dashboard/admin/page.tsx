"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import api from "@/lib/api-client";
import type { UserPublic } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { UserPlus, Trash2, X } from "lucide-react";

export default function AdminPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ email: "", password: "", role: "staff" });
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

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
    if (!createForm.email || !createForm.password) return;
    try {
      await api.register(createForm);
      setShowCreate(false);
      setCreateForm({ email: "", password: "", role: "staff" });
      load();
    } catch (err: any) {
      setCreateError(err?.response?.data?.detail || "Tạo thất bại");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa người dùng này?")) return;
    setUsers((prev) => prev.filter((u) => u.id !== id));
    try { await api.deleteUser(id); }
    catch { load(); }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setShowCreate(true)} icon={<UserPlus size={16} />}>
          Thêm người dùng
        </Button>
      </div>

      {/* User list */}
      <Card padding="none">
        {loading ? (
          <div className="p-8 text-center text-text-3 text-body-sm">Đang tải...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-text-3 text-body-sm">Không có người dùng nào</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Vai trò</th>
                  <th>Khuôn mặt</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-text">{u.email}</td>
                    <td>
                      <Badge variant={u.role === "admin" ? "warning" : "neutral"} className="capitalize">
                        {u.role === "admin" ? "Quản trị" : u.role === "staff" ? "Nhân viên" : u.role}
                      </Badge>
                    </td>
                    <td>
                      {u.has_face ? (
                        <span className="inline-flex items-center gap-1 text-success text-body-sm">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Đã xác thực
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-text-3 text-body-sm">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Chưa xác thực
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        className="btn-ghost px-2.5 py-1 text-error text-body-sm flex items-center gap-1"
                        onClick={() => handleDelete(u.id)}
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="bg-surface-2 rounded-2xl p-6 w-full max-w-md border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-heading-lg text-text">Thêm người dùng</h2>
              <button onClick={() => setShowCreate(false)} className="text-text-3 hover:text-text transition-colors">
                <X size={18} />
              </button>
            </div>

            {createError && (
              <div className="mb-4 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-body-sm">{createError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-body-sm font-medium text-text-2 mb-1.5">Email</label>
                <input type="email" className="input" value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@iuh.edu.vn" />
              </div>
              <div>
                <label className="block text-body-sm font-medium text-text-2 mb-1.5">Mật khẩu</label>
                <input type="password" className="input" value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-body-sm font-medium text-text-2 mb-1.5">Vai trò</label>
                <select className="input" value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}>
                  <option value="staff">staff</option>
                  <option value="admin">admin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <Button onClick={handleCreate} className="flex-1" icon={<UserPlus size={16} />}>Tạo</Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">Hủy</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}