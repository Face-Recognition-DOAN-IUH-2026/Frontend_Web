'use client';

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/lib/api-client";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import MultiAngleCapture from "@/components/MultiAngleCapture";
import { BookOpen } from "lucide-react";
import type { AccessLogPublic, BorrowRecord, PatronPublic, PatronUpdate } from "@/lib/types";
import type { CaptureAngle } from "@/components/MultiAngleCapture";

export default function PatronDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [patron, setPatron] = useState<PatronPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AccessLogPublic[]>([]);
  const [logsTotal, setLogsTotal] = useState(0);
  const [logsSkip, setLogsSkip] = useState(0);
  const logsLimit = 20;

  const [borrows, setBorrows] = useState<BorrowRecord[]>([]);

  const [editForm, setEditForm] = useState<PatronUpdate>({});
  const [showEdit, setShowEdit] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [consent, setConsent] = useState(false);
  const [enrollError, setEnrollError] = useState("");
  const [enrollSuccess, setEnrollSuccess] = useState("");
  const [enrollLoading, setEnrollLoading] = useState(false);

  const loadPatron = useCallback(async () => {
    try {
      const data = await api.getPatron(id);
      setPatron(data);
    } catch { return null; }
  }, [id]);

  const loadLogs = useCallback(async (append = false) => {
    try {
      const data = await api.getAccessLogs({ patronId: id, skip: logsSkip, limit: logsLimit });
      if (append) setLogs((prev) => [...prev, ...data.items]);
      else setLogs(data.items);
      setLogsTotal(data.total);
    } catch { }
  }, [id, logsSkip]);

  const loadBorrows = useCallback(async () => {
    try {
      const data = await api.getBorrowHistory({ patronId: id });
      setBorrows(data);
    } catch { /* silent fail */ }
  }, [id]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadPatron(), loadLogs(), loadBorrows()]);
      setLoading(false);
    })();
  }, [loadPatron, loadLogs, loadBorrows]);

  const handleEdit = async () => {
    if (!patron) return;
    await api.updatePatron(patron.id, editForm);
    setShowEdit(false);
    setEditForm({});
    await loadPatron();
  };

  const handleRenew = async () => {
    if (!patron) return;
    const current = new Date(patron.membership_expiry);
    const next = new Date(current);
    next.setFullYear(next.getFullYear() + 1);
    await api.updatePatron(patron.id, { membership_expiry: next.toISOString().split("T")[0] });
    await loadPatron();
  };

  const handleDelete = async () => {
    if (!patron || !confirm("Xóa độc giả này?")) return;
    try {
      await api.deletePatron(patron.id);
      router.push("/patrons");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        alert("Độc giả không tồn tại hoặc đã bị xóa trước đó.");
        router.push("/patrons");
      } else {
        alert("Xóa thất bại: " + (getErrorMessage(err) || "Lời không xác định"));
      }
    }
  };

  const handleEnroll = async (files: Record<CaptureAngle, File>) => {
    if (!patron) return;
    setEnrollLoading(true);
    setEnrollError("");
    setEnrollSuccess("");
    try {
      await api.enrollPatronFaceBatch(patron.id, {
        frontal: files.frontal,
        right: files.right,
        left: files.left,
        down: files.down,
      });
      setEnrollSuccess("Đăng ký khuôn mặt thành công!");
      setShowEnroll(false);
      setConsent(false);
      await loadPatron();
    } catch (err: any) {
      const errCode = err?.response?.data?.error || err?.response?.data?.detail;
      const errorMessages: Record<string, string> = {
        LIVENESS_FAILED: "Ảnh không phải khuôn mặt thật, vui lòng chụp ảnh trực tiếp",
        NO_FACE_DETECTED: "Không tìm thấy khuôn mặt trong ảnh, vui lòng thử lại",
        MULTIPLE_FACES: "Có nhiều hơn 1 khuôn mặt trong ảnh, vui lòng chụp lại",
        LOW_QUALITY: "Ảnh quá mờ hoặc thiếu sáng, vui lòng chụp lại với điều kiện ánh sáng tốt hơn",
        FACE_DETECTION_FAILED: "Không thể trích xuất khuôn mặt, vui lòng thử lại",
      };
      setEnrollError(errorMessages[errCode] || getErrorMessage(err) || "Đăng ký thất bại");
    } finally {
      setEnrollLoading(false);
    }
  };

  if (loading) return <p className="text-text-3">Đang tải...</p>;
  if (!patron) return (
    <div className="text-center py-12">
      <p className="text-text-2 text-lg mb-4">Không tìm thấy độc giả</p>
      <p className="text-text-3 text-sm mb-6">Độc giả có thể đã bị xóa hoặc ID không hợp lệ.</p>
      <Button variant="primary" onClick={() => router.push("/patrons")}>
        &larr; Quay lại danh sách
      </Button>
    </div>
  );

  const pageCount = Math.max(1, Math.ceil(logsTotal / logsLimit));
  const currentPage = Math.floor(logsSkip / logsLimit) + 1;

  return (
    <div className="space-y-6 max-w-4xl">
      <button onClick={() => router.push("/patrons")} className="text-primary hover:underline text-sm">&larr; Quay lại danh sách</button>

      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <h1 className="text-2xl font-bold">{patron.full_name}</h1>
              <p className="text-text-3">MSSV: {patron.student_code} &middot; Mã thẻ: {patron.card_number}</p>
            </div>
            <Badge variant={patron.status === "active" ? "success" : "error"}>
              {patron.status}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <div><span className="text-text-3">Họ tên:</span> <span className="font-medium">{patron.full_name}</span></div>
            <div><span className="text-text-3">MSSV:</span> <span className="font-medium">{patron.student_code}</span></div>
            <div><span className="text-text-3">Lớp:</span> <span className="font-medium">{patron.class_name || "-"}</span></div>
            <div><span className="text-text-3">Mã thẻ:</span> <span className="font-medium">{patron.card_number}</span></div>
            <div><span className="text-text-3">Ngày cấp thẻ:</span> <span className="font-medium">{patron.issue_date || "-"}</span></div>
            <div><span className="text-text-3">Hạn thẻ:</span>
              <span className={`font-medium ml-1 ${new Date(patron.membership_expiry) < new Date() ? "text-error" : "text-success"}`}>
                {patron.membership_expiry}
              </span>
            </div>
            <div><span className="text-text-3">Khuôn mặt:</span>
              <span className={`font-medium ml-1 ${patron.has_face ? "text-success" : "text-text-3"}`}>
                {patron.has_face ? "✓ Đã đăng ký" : "✗ Chưa đăng ký"}
              </span>
            </div>
            <div><span className="text-text-3">Tạo lúc:</span> <span className="font-medium">{new Date(patron.created_at).toLocaleString("vi-VN")}</span></div>
          </div>
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button variant="primary" className="text-sm" onClick={() => { setEditForm({
              full_name: patron.full_name,
              class_name: patron.class_name || undefined,
              membership_expiry: patron.membership_expiry,
              status: patron.status,
            }); setShowEdit(true); }}>Sửa thông tin</Button>
            <Button variant="secondary" className="text-sm" onClick={handleRenew}>Gia hạn thẻ</Button>
            {!patron.has_face && (
              <Button variant="ghost" className="text-sm" onClick={() => setShowEnroll(true)}>📷 Đăng ký khuôn mặt</Button>
            )}
            <Button variant="danger" className="text-sm" onClick={handleDelete}>Xóa</Button>
          </div>
          {enrollSuccess && (
            <div className="mt-4 p-3 bg-success/5 border border-success/10 rounded-lg text-success text-sm flex items-center gap-2">
              <span className="text-lg">✓</span> {enrollSuccess}
            </div>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <h3 className="font-semibold text-lg">Lịch sử mượn sách</h3>
          </div>
        </div>
        {borrows.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={20} className="text-text-3" />
            </div>
            <p className="text-text-3 text-sm italic">Độc giả này chưa mượn cuốn sách nào.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr className="border-b border-border">
                <th className="p-3 text-left font-medium">Mã sách</th>
                <th className="p-3 text-left font-medium">Ngày mượn</th>
                <th className="p-3 text-left font-medium">Hạn trả</th>
                <th className="p-3 text-left font-medium">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {borrows.map((b) => {
                const isOverdue = b.status === "borrowed" && new Date(b.due_at) < new Date();
                return (
                  <tr key={b.id} className="border-t hover:bg-surface-2/20">
                    <td className="p-3">
                      <div className="font-medium text-text">{b.book?.title || b.book_id}</div>
                      <div className="font-mono text-xs text-text-3">{b.book?.isbn || b.book_id}</div>
                    </td>
                    <td className="p-3">{new Date(b.borrow_at).toLocaleDateString("vi-VN")}</td>
                    <td className={`p-3 ${isOverdue ? "text-error font-semibold" : ""}`}>
                      {new Date(b.due_at).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="p-3">
                      <Badge variant={isOverdue ? "error" : b.status === "returned" ? "neutral" : "success"}>
                        {b.status === "returned" ? "Đã trả" : isOverdue ? "Quá hạn" : "Đang mượn"}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      {showEnroll && !patron.has_face && (
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold text-lg">Đăng ký khuôn mặt 4 góc</h3>
          </div>
          <div className="p-4">
            <MultiAngleCapture
              consent={consent}
              setConsent={setConsent}
              onFilesReady={handleEnroll}
            />
            {enrollError && <p className="text-error text-sm mt-2">{enrollError}</p>}
            {enrollLoading && <p className="text-primary text-sm mt-2">Đang đăng ký...</p>}
          </div>
          <div className="p-4 pt-0">
            <Button variant="ghost" className="text-sm" onClick={() => { setShowEnroll(false); setEnrollError(""); setConsent(false); }}>✕ Đóng</Button>
          </div>
        </Card>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowEdit(false)}>
          <div className="bg-surface-2 rounded-lg p-6 w-full max-w-md space-y-4 shadow-2xl border border-border" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold">Sửa độc giả</h2>
            {[["full_name", "Họ tên"], ["class_name", "Lớp"],
              ["membership_expiry", "Hạn thẻ"], ["status", "Trạng thái"]
            ].map(([key, label]) => (
              <label key={key} className="block">
                <span className="text-sm font-medium">{label}:</span>
                {key === "status" ? (
                  <select className="mt-1 block w-full px-3 py-2 border rounded-md"
                    value={(editForm as any)[key] || ""}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}>
                    <option value="active">active</option>
                    <option value="inactive">inactive</option>
                    <option value="expired">expired</option>
                  </select>
                ) : (
                  <input className="mt-1 block w-full px-3 py-2 border rounded-md"
                    value={(editForm as any)[key] || ""}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    type={key === "membership_expiry" ? "date" : "text"} />
                )}
              </label>
            ))}
            <div className="flex gap-3 pt-2">
              <Button variant="primary" className="px-4 py-2" onClick={handleEdit}>Lưu</Button>
              <Button variant="ghost" className="px-4 py-2" onClick={() => setShowEdit(false)}>Hủy</Button>
            </div>
          </div>
        </div>
      )}

      <Card>
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Lịch sử ra vào</h2>
        </div>
        {logs.length === 0 ? (
          <p className="p-4 text-text-3 text-sm">Chưa có lịch sử ra vào</p>
        ) : (
          <>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-surface-2">
                  <th className="p-3 text-left font-medium">Thời gian</th>
                  <th className="p-3 text-left font-medium">Loại</th>
                  <th className="p-3 text-left font-medium">Cổng</th>
                  <th className="p-3 text-left font-medium">Phương thức</th>
                  <th className="p-3 text-left font-medium">Độ tin cậy</th>
                  <th className="p-3 text-left font-medium">Kết quả</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-surface-2/20">
                    <td className="p-3 whitespace-nowrap">{new Date(log.access_time).toLocaleString("vi-VN")}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.access_type === "entry" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                      }`}>{log.access_type === "entry" ? "Vào" : "Ra"}</span>
                    </td>
                    <td className="p-3 text-text-2">{log.camera_id}</td>
                    <td className="p-3 text-text-2">{log.verify_method}</td>
                    <td className="p-3">
                      {log.confidence != null ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-surface-2 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${
                              log.confidence >= 0.8 ? "bg-success" : log.confidence >= 0.6 ? "bg-warning" : "bg-error"
                            }`} style={{ width: `${(log.confidence * 100).toFixed(0)}%` }} />
                          </div>
                          <span className="text-xs">{(log.confidence * 100).toFixed(0)}%</span>
                        </div>
                      ) : "-"}
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === "success" ? "bg-success/15 text-success" : "bg-error/15 text-error"
                      }`}>{log.status === "success" ? "✓" : "✗"}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {logsTotal > logsLimit && (
              <div className="flex items-center justify-between p-4 border-t text-sm">
                <span className="text-text-2">Tổng: {logsTotal}</span>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="px-3 py-1 rounded-md disabled:opacity-40"
                    disabled={currentPage <= 1}
                    onClick={() => setLogsSkip(0)}>«</Button>
                  <span className="text-text-2">Trang {currentPage} / {pageCount}</span>
                  <Button variant="ghost" className="px-3 py-1 rounded-md disabled:opacity-40"
                    disabled={currentPage >= pageCount}
                    onClick={() => setLogsSkip((pageCount - 1) * logsLimit)}>»</Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
