"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api-client";
import type { PatronPublic, PatronCreate } from "@/lib/types";

export default function PatronsPage() {
  const [patrons, setPatrons] = useState<PatronPublic[]>([]);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<PatronCreate>({
    full_name: "",
    student_code: "",
    card_number: "",
    membership_expiry: "",
  });

  const load = async () => {
    const data = await api.searchPatrons(query || undefined);
    setPatrons(data);
  };

  useEffect(() => { load(); }, []);

  const handleSearch = () => load();

  const handleCreate = async () => {
    await api.createPatron(form);
    setShowForm(false);
    setForm({ full_name: "", student_code: "", card_number: "", membership_expiry: "" });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Xóa độc giả này?")) return;
    await api.deletePatron(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patrons</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Hủy" : "Thêm độc giả"}
        </button>
      </div>

      {showForm && (
        <div className="p-4 border rounded-lg space-y-3 max-w-md">
          {[
            ["full_name", "Họ tên"],
            ["student_code", "MSSV"],
            ["card_number", "Mã thẻ"],
            ["membership_expiry", "Hạn thẻ"],
          ].map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-sm font-medium">{label}:</span>
              <input
                className="mt-1 block w-full px-3 py-2 border rounded-md"
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                type={key === "membership_expiry" ? "date" : "text"}
              />
            </label>
          ))}
          <button className="px-4 py-2 bg-green-600 text-white rounded-md" onClick={handleCreate}>
            Tạo
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 border rounded-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Tìm theo tên, MSSV, mã thẻ..."
        />
        <button className="px-4 py-2 bg-gray-600 text-white rounded-md" onClick={handleSearch}>
          Tìm
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 text-left">Họ tên</th>
              <th className="p-2 text-left">MSSV</th>
              <th className="p-2 text-left">Email</th>
              <th className="p-2 text-left">SĐT</th>
              <th className="p-2 text-left">Hạn thẻ</th>
              <th className="p-2 text-left">Trạng thái</th>
              <th className="p-2 text-left">Khuôn mặt</th>
              <th className="p-2 text-left">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {patrons.map((p) => (
              <tr key={p.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{p.full_name}</td>
                <td className="p-2">{p.student_code}</td>
                <td className="p-2">{p.email || "-"}</td>
                <td className="p-2">{p.phone || "-"}</td>
                <td className="p-2">{p.membership_expiry}</td>
                <td className="p-2">{p.status}</td>
                <td className="p-2">{p.has_face ? "✓" : "✗"}</td>
                <td className="p-2">
                  <button className="text-red-600 text-sm" onClick={() => handleDelete(p.id)}>
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
