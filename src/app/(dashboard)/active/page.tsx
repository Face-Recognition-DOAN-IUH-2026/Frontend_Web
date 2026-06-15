"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api-client";
import type { ActivePatron } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Clock,
  DoorOpen,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";

const ACTIVE_CAMERA_IDS = new Set(["entry_gate", "exit_gate", "kiosk"]);

const CAMERA_LABELS: Record<string, string> = {
  entry_gate: "Cổng vào",
  exit_gate: "Cổng ra",
  kiosk: "Kiosk",
};

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));
  if (minutes < 1) return "Vừa vào";
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} giờ ${rest} phút` : `${hours} giờ`;
}

function initials(name?: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export default function ActivePage() {
  const [patrons, setPatrons] = useState<ActivePatron[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const load = async () => {
    try {
      setError(null);
      const data = await api.getActivePatrons();
      const allowed = data.items
        .filter((patron) => ACTIVE_CAMERA_IDS.has(patron.camera_id))
        .sort((a, b) => new Date(b.entered_at).getTime() - new Date(a.entered_at).getTime());
      setPatrons(allowed);
      setLastUpdate(new Date());
    } catch {
      setError("Không thể tải danh sách độc giả đang trong thư viện");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  const filteredPatrons = useMemo(() => {
    const q = normalizeQuery(search);
    if (!q) return patrons;
    return patrons.filter((patron) => (
      patron.full_name.toLowerCase().includes(q)
      || patron.student_code.toLowerCase().includes(q)
    ));
  }, [patrons, search]);

  const cameraCounts = useMemo(() => {
    return patrons.reduce<Record<string, number>>((acc, patron) => {
      acc[patron.camera_id] = (acc[patron.camera_id] || 0) + 1;
      return acc;
    }, {});
  }, [patrons]);

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
        <Card variant="elevated" className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid min-h-[180px] grid-cols-1 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col justify-between bg-success/10 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/15 text-success">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-label text-success">Đang trong thư viện</p>
                  <p className="mt-2 text-display-2xl text-text">{patrons.length}</p>
                </div>
              </div>
              <div className="flex flex-col justify-between p-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="success" dot>Đang cập nhật</Badge>
                    <span className="text-caption text-text-3">
                      Làm mới mỗi 10 giây
                    </span>
                  </div>
                  <h2 className="mt-4 text-heading-xl text-text">Danh sách hiện diện</h2>
                  <p className="mt-2 max-w-2xl text-body-sm text-text-3">
                    Chỉ hiển thị độc giả được ghi nhận qua cổng vào, cổng ra hoặc kiosk.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3 text-body-sm text-text-2">
                  <span className="flex items-center gap-2">
                    <RefreshCw size={14} />
                    Cập nhật {lastUpdate.toLocaleTimeString("vi-VN")}
                  </span>
                  {error && <Badge variant="error">{error}</Badge>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-text-3" />
              Nguồn ghi nhận
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={load}
              disabled={loading}
              title="Làm mới"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            {Object.entries(CAMERA_LABELS).map(([cameraId, label]) => (
              <div key={cameraId} className="rounded-lg border border-border bg-surface-2 p-3">
                <p className="text-caption text-text-3">{label}</p>
                <p className="mt-1 text-heading-lg text-text">{cameraCounts[cameraId] || 0}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader className="items-start gap-4 md:items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCheck size={18} className="text-text-3" />
              Độc giả đang có mặt
            </CardTitle>
            <p className="mt-1 text-body-sm text-text-3">
              {filteredPatrons.length} kết quả hiển thị
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <Input
              placeholder="Tìm theo tên hoặc MSSV..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              icon={<Search size={16} />}
            />
          </div>
        </CardHeader>

        <CardContent>
          {loading && patrons.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-body-sm text-text-3">Đang tải danh sách...</p>
              </div>
            </div>
          ) : patrons.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<DoorOpen size={24} />}
                title="Chưa có độc giả trong thư viện"
                description="Danh sách sẽ tự cập nhật khi có lượt vào hợp lệ từ cổng hoặc kiosk."
              />
            </div>
          ) : filteredPatrons.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={<Search size={24} />}
                title="Không tìm thấy độc giả"
                description="Thử tìm bằng MSSV hoặc một phần họ tên khác."
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
              {filteredPatrons.map((patron) => (
                <div
                  key={patron.id}
                  className="group rounded-lg border border-border bg-surface-2 p-4 transition-colors hover:border-success/40"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-body-lg font-bold text-primary">
                      {initials(patron.full_name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-body-md font-semibold text-text">
                            {patron.full_name || "Chưa có tên"}
                          </p>
                          <p className="mt-0.5 font-mono text-caption text-text-3">
                            {patron.student_code}
                          </p>
                        </div>
                        <Badge variant="success" dot>Đang ở trong</Badge>
                      </div>

                      <div className="mt-4 grid gap-3 text-body-sm text-text-2 sm:grid-cols-3">
                        <span className="flex items-center gap-2">
                          <Clock size={14} className="shrink-0 text-text-3" />
                          {formatTime(patron.entered_at)}
                        </span>
                        <span className="flex items-center gap-2">
                          <MapPin size={14} className="shrink-0 text-text-3" />
                          {CAMERA_LABELS[patron.camera_id] || patron.camera_id}
                        </span>
                        <span className="flex items-center gap-2">
                          <UserCheck size={14} className="shrink-0 text-text-3" />
                          {formatDuration(patron.entered_at)}
                        </span>
                      </div>

                      {patron.confidence != null && (
                        <div className="mt-4 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
                            <div
                              className="h-full rounded-full bg-success"
                              style={{ width: `${Math.round(patron.confidence * 100)}%` }}
                            />
                          </div>
                          <span className="text-caption font-medium text-success">
                            {Math.round(patron.confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
