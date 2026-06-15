"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Move,
  Plus,
  RefreshCw,
  UserCheck,
  Users,
} from "lucide-react";
import api, { getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { LibraryZone, ScheduleStaff, StaffScheduleAssignment, StaffShift } from "@/lib/types";

const DAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  value.setHours(0, 0, 0, 0);
  return value;
}

function getWeekDays(anchor: Date) {
  return Array.from({ length: 7 }, (_, index) => {
    const value = new Date(anchor);
    value.setDate(anchor.getDate() + index);
    return value;
  });
}

function normalizeTime(time?: string) {
  return (time || "").slice(0, 5);
}

function initials(name?: string | null, email?: string) {
  const source = name || email || "S";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function DraggableStaff({ staff }: { staff: ScheduleStaff }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `staff:${staff.id}`,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`w-full rounded-md border border-border bg-surface-2 p-3 text-left transition ${
        isDragging ? "opacity-60 ring-2 ring-primary" : "hover:border-primary/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
          {initials(staff.fullName, staff.email)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-body-sm font-semibold text-text">{staff.fullName || staff.email}</span>
          <span className="block truncate text-caption text-text-3">{staff.email}</span>
        </span>
      </div>
    </button>
  );
}

function DraggableAssignment({ item }: { item: StaffScheduleAssignment }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `assignment:${item.id}`,
  });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-md border border-border bg-bg/80 p-2 shadow-sm transition ${
        isDragging ? "opacity-70 ring-2 ring-primary" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-caption font-semibold text-text">{item.staff?.fullName || item.staff?.email || item.staffId}</p>
          <p className="text-[11px] text-text-3">{item.status}</p>
        </div>
        <Move size={13} className="shrink-0 text-text-3" />
      </div>
    </div>
  );
}

function DropCell({
  id,
  assignments,
}: {
  id: string;
  assignments: StaffScheduleAssignment[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[94px] rounded-md border border-dashed p-2 transition ${
        isOver ? "border-primary bg-primary/10" : "border-border bg-surface/70"
      }`}
    >
      {assignments.length === 0 ? (
        <div className="flex h-full min-h-[64px] items-center justify-center text-center text-[11px] text-text-3">
          Tha nhan vien vao day
        </div>
      ) : (
        <div className="space-y-2">
          {assignments.map((item) => (
            <DraggableAssignment key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptySetup({
  zones,
  shifts,
  onCreateDefaults,
  loading,
}: {
  zones: LibraryZone[];
  shifts: StaffShift[];
  onCreateDefaults: () => void;
  loading: boolean;
}) {
  if (zones.length && shifts.length) return null;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 text-warning" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-text">Chua co cau hinh lich truc</h3>
          <p className="mt-1 text-body-sm text-text-2">
            Can it nhat mot khu vuc va mot ca truc de bat dau dieu phoi. Ban co the tao bo mau nhanh cho demo.
          </p>
        </div>
        <button
          onClick={onCreateDefaults}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-body-sm font-semibold text-bg disabled:opacity-60"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Tao mau
        </button>
      </div>
    </div>
  );
}

export default function StaffSchedulesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isStaff = user?.role === "admin" || user?.role === "staff";
  const [weekStart, setWeekStart] = useState(() => startOfWeek());
  const [staff, setStaff] = useState<ScheduleStaff[]>([]);
  const [zones, setZones] = useState<LibraryZone[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [assignments, setAssignments] = useState<StaffScheduleAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState({ dateFrom: toDateInput(new Date()), dateTo: toDateInput(new Date()), reason: "" });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const from = toDateInput(days[0]);
  const to = toDateInput(days[6]);

  const loadData = useCallback(async () => {
    if (!isStaff) return;
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const [staffResult, zoneResult, shiftResult, assignmentResult] = await Promise.all([
          api.getScheduleStaffOptions(),
          api.getScheduleZones(),
          api.getScheduleShifts(),
          api.getScheduleAssignments({ from, to }),
        ]);
        setStaff(staffResult.filter((item) => item.role === "admin" || item.role === "staff"));
        setZones(zoneResult.filter((item) => item.isActive));
        setShifts(shiftResult.filter((item) => item.isActive));
        setAssignments(assignmentResult.items);
      } else {
        const assignmentResult = await api.getMySchedules({ from, to });
        setAssignments(assignmentResult.items);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [from, isAdmin, isStaff, to]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const assignmentsForCell = (workDate: string, zoneId: string, shiftId: string) =>
    assignments.filter((item) => item.workDate === workDate && item.zoneId === zoneId && item.shiftId === shiftId && item.status !== "cancelled");

  const createDefaults = async () => {
    setSaving(true);
    setError(null);
    try {
      const createdZones = zones.length
        ? zones
        : await Promise.all([
            api.createScheduleZone({ floor: 1, zoneName: "Tang 1 - Quay muon tra" }),
            api.createScheduleZone({ floor: 2, zoneName: "Tang 2 - Kho sach" }),
          ]);
      const createdShifts = shifts.length
        ? shifts
        : await Promise.all([
            api.createScheduleShift({ name: "Ca sang", startTime: "07:30", endTime: "11:30", minStaff: 1 }),
            api.createScheduleShift({ name: "Ca chieu", startTime: "13:00", endTime: "17:00", minStaff: 1 }),
            api.createScheduleShift({ name: "Ca toi", startTime: "17:30", endTime: "20:30", minStaff: 1 }),
          ]);
      setZones(createdZones);
      setShifts(createdShifts);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const overId = String(event.over?.id || "");
    const activeId = String(event.active.id || "");
    if (!overId.startsWith("cell:")) return;

    const [, workDate, zoneId, shiftId] = overId.split(":");
    setSaving(true);
    setError(null);
    try {
      if (activeId.startsWith("staff:")) {
        await api.createScheduleAssignment({ staffId: activeId.replace("staff:", ""), workDate, zoneId, shiftId });
      } else if (activeId.startsWith("assignment:")) {
        await api.moveScheduleAssignment(activeId.replace("assignment:", ""), { workDate, zoneId, shiftId });
      }
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submitAvailability = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.createMyAvailability({
        dateFrom: availability.dateFrom,
        dateTo: availability.dateTo,
        reason: availability.reason || null,
      });
      setAvailability((value) => ({ ...value, reason: "" }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const runAssignmentAction = async (id: string, action: "confirm" | "check-in" | "check-out") => {
    setSaving(true);
    setError(null);
    try {
      if (action === "confirm") await api.confirmScheduleAssignment(id);
      if (action === "check-in") await api.checkInScheduleAssignment(id);
      if (action === "check-out") await api.checkOutScheduleAssignment(id);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="rounded-lg border border-border bg-surface p-6 text-text">
        Ban khong co quyen xem lich truc.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CalendarDays size={22} />
          </div>
          <div>
            <h2 className="text-heading-md text-text">Bang dieu phoi lich truc</h2>
            <p className="text-body-sm text-text-3">Quan ly theo tuan, tang, khu vuc va ca truc.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekStart((value) => new Date(value.setDate(value.getDate() - 7)))}
            className="rounded-md border border-border px-3 py-2 text-body-sm text-text hover:bg-surface-2"
          >
            Tuan truoc
          </button>
          <div className="rounded-md bg-surface-2 px-3 py-2 text-body-sm font-semibold text-text">
            {from} - {to}
          </div>
          <button
            onClick={() => setWeekStart((value) => new Date(value.setDate(value.getDate() + 7)))}
            className="rounded-md border border-border px-3 py-2 text-body-sm text-text hover:bg-surface-2"
          >
            Tuan sau
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-body-sm text-text hover:bg-surface-2 disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Tai lai
          </button>
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-lg border border-error/40 bg-error/10 p-4 text-error">
          <AlertCircle size={18} className="mt-0.5" />
          <p className="text-body-sm">{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex h-56 items-center justify-center rounded-lg border border-border bg-surface">
          <Loader2 className="animate-spin text-primary" size={30} />
        </div>
      ) : isAdmin ? (
        <div className="grid gap-5 xl:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-3 flex items-center gap-2">
                <Users size={18} className="text-primary" />
                <h3 className="font-semibold text-text">Staff pool</h3>
              </div>
              <div className="space-y-2">
                {staff.length ? staff.map((item) => <DraggableStaff key={item.id} staff={item} />) : (
                  <p className="text-body-sm text-text-3">Chua lay duoc danh sach staff tu user-service.</p>
                )}
              </div>
            </div>
            <EmptySetup zones={zones} shifts={shifts} onCreateDefaults={createDefaults} loading={saving} />
          </div>

          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="overflow-x-auto rounded-lg border border-border bg-surface p-4">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[170px_repeat(7,minmax(110px,1fr))] gap-2">
                  <div />
                  {days.map((day, index) => (
                    <div key={day.toISOString()} className="rounded-md bg-surface-2 p-2 text-center">
                      <p className="text-caption font-semibold text-primary">{DAY_LABELS[index]}</p>
                      <p className="text-body-sm text-text">{toDateInput(day).slice(5)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 space-y-4">
                  {zones.map((zone) => (
                    <div key={zone.id} className="grid grid-cols-[170px_repeat(7,minmax(110px,1fr))] gap-2">
                      <div className="rounded-md border border-border bg-bg/60 p-3">
                        <div className="flex items-center gap-2 text-text">
                          <MapPin size={16} className="text-primary" />
                          <span className="font-semibold">{zone.zoneName}</span>
                        </div>
                        <p className="mt-1 text-caption text-text-3">Tang {zone.floor}</p>
                      </div>
                      {days.map((day) => (
                        <div key={`${zone.id}-${day.toISOString()}`} className="space-y-2">
                          {shifts.map((shift) => {
                            const date = toDateInput(day);
                            return (
                              <div key={`${date}-${zone.id}-${shift.id}`} className="rounded-md bg-surface-2 p-2">
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="truncate text-[11px] font-semibold text-text">{shift.name}</span>
                                  <span className="text-[10px] text-text-3">
                                    {normalizeTime(shift.startTime)}-{normalizeTime(shift.endTime)}
                                  </span>
                                </div>
                                <DropCell
                                  id={`cell:${date}:${zone.id}:${shift.id}`}
                                  assignments={assignmentsForCell(date, zone.id, shift.id)}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </DndContext>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="rounded-lg border border-border bg-surface p-4">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-primary" />
              <h3 className="font-semibold text-text">Lich tuan cua toi</h3>
            </div>
            <div className="space-y-3">
              {assignments.length ? assignments.map((item) => (
                <div key={item.id} className="rounded-md border border-border bg-surface-2 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-text">{item.workDate} - {item.shift?.name || item.shiftId}</p>
                      <p className="mt-1 text-body-sm text-text-3">
                        {normalizeTime(item.shift?.startTime)}-{normalizeTime(item.shift?.endTime)} tai {item.zone?.zoneName || item.zoneId}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/15 px-2 py-1 text-caption font-semibold text-primary">{item.status}</span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => runAssignmentAction(item.id, "confirm")} disabled={saving} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-body-sm text-text hover:bg-bg">
                      <CheckCircle2 size={15} /> Xac nhan
                    </button>
                    <button onClick={() => runAssignmentAction(item.id, "check-in")} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-success px-3 py-2 text-body-sm font-semibold text-white disabled:opacity-60">
                      <Clock size={15} /> Check-in
                    </button>
                    <button onClick={() => runAssignmentAction(item.id, "check-out")} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-warning px-3 py-2 text-body-sm font-semibold text-bg disabled:opacity-60">
                      <Clock size={15} /> Check-out
                    </button>
                  </div>
                </div>
              )) : (
                <div className="rounded-md border border-dashed border-border p-8 text-center text-text-3">
                  Ban chua co ca truc trong tuan nay.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="font-semibold text-text">Dang ky ngay nghi</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-body-sm text-text-2">
                Tu ngay
                <input value={availability.dateFrom} onChange={(event) => setAvailability((value) => ({ ...value, dateFrom: event.target.value }))} type="date" className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text" />
              </label>
              <label className="block text-body-sm text-text-2">
                Den ngay
                <input value={availability.dateTo} onChange={(event) => setAvailability((value) => ({ ...value, dateTo: event.target.value }))} type="date" className="mt-1 w-full rounded-md border border-border bg-bg px-3 py-2 text-text" />
              </label>
              <label className="block text-body-sm text-text-2">
                Ly do
                <textarea value={availability.reason} onChange={(event) => setAvailability((value) => ({ ...value, reason: event.target.value }))} className="mt-1 min-h-24 w-full rounded-md border border-border bg-bg px-3 py-2 text-text" />
              </label>
              <button onClick={submitAvailability} disabled={saving} className="w-full rounded-md bg-primary px-3 py-2 text-body-sm font-semibold text-bg disabled:opacity-60">
                Gui yeu cau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
