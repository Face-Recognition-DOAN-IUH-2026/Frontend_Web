"use client";

import { useMemo, useState } from "react";
import Modal from "antd/es/modal";
import Form from "antd/es/form";
import Select from "antd/es/select";
import Checkbox from "antd/es/checkbox";
import Button from "antd/es/button";
import Alert from "antd/es/alert";
import notification from "antd/es/notification";
import { useColorMode } from "@/lib/mui-theme";
import api from "@/lib/api-client";
import type { ScheduleStaff, StaffShift, LibraryZone, StaffScheduleAssignment } from "@/lib/types";

interface AssignStaffDialogProps {
  open: boolean;
  date: string;
  shiftId: string;
  shiftName: string;
  shifts: StaffShift[];
  zones: LibraryZone[];
  staff: ScheduleStaff[];
  existingAssignments: StaffScheduleAssignment[];
  dayAssignments: StaffScheduleAssignment[];
  onClose: () => void;
  onAssigned: () => void;
}

interface FormValues {
  zoneId: string;
  staffId: string;
  forceSave: boolean;
}

export default function AssignStaffDialog({
  open,
  date,
  shiftId,
  shiftName,
  shifts,
  zones,
  staff,
  existingAssignments,
  dayAssignments,
  onClose,
  onAssigned,
}: AssignStaffDialogProps) {
  const { effectiveMode } = useColorMode();
  const isDark = effectiveMode === "dark";
  const [apiAnt, contextHolder] = notification.useNotification();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [forceSave, setForceSave] = useState(false);

  const shift = useMemo(() => shifts.find((s) => s.id === shiftId), [shifts, shiftId]);

  const existingStaffIds = useMemo(
    () => new Set(existingAssignments.map((a) => a.staffId)),
    [existingAssignments],
  );

  const availableStaff = useMemo(
    () => staff.filter((s) => !existingStaffIds.has(s.id)),
    [staff, existingStaffIds],
  );

  const reset = () => {
    form.resetFields();
    setError(null);
    setForceSave(false);
    setWarnings([]);
  };

  const gatherWarnings = (staffId: string): string[] => {
    const w: string[] = [];
    const selectedStaff = staff.find((s) => s.id === staffId);
    if (!selectedStaff) return w;
    const existAsg = dayAssignments.find((a) => a.staffId === staffId);
    if (existAsg) {
      const existShift = shifts.find((sh) => sh.id === existAsg.shiftId);
      const newStart = shift?.startTime?.slice(0, 5);
      const newEnd = shift?.endTime?.slice(0, 5);
      const existStart = existShift?.startTime?.slice(0, 5);
      const existEnd = existShift?.endTime?.slice(0, 5);
      const isOverlap = newStart && newEnd && existStart && existEnd && (newStart < existEnd && newEnd > existStart);
      if (isOverlap) {
        w.push(`${selectedStaff.fullName || selectedStaff.email} đã có ca ${existShift?.name || existAsg.shiftId} trùng giờ`);
      }
    }
    return w;
  };

  const handleAssign = async () => {
    try {
      const values = await form.validateFields();
      const w = gatherWarnings(values.staffId);
      if (w.length > 0 && !forceSave) {
        setWarnings(w);
        return;
      }
      setSaving(true);
      setError(null);
      setWarnings([]);
      const params: any = { staffId: values.staffId, shiftId, zoneId: values.zoneId, workDate: date };
      if (forceSave && w.length > 0) params.force = true;
      await api.createScheduleAssignment(params);
      apiAnt.success({ title: "Phân ca thành công", placement: "topRight" });
      reset();
      onAssigned();
    } catch (err: any) {
      if (err?.errorFields) return;
      const data = err?.response?.data;
      setError(data?.error || data?.message || data?.detail?.[0]?.message || err?.message || "Có lỗi xảy ra");
    } finally {
      setSaving(false);
    }
  };

  const getStaffLabel = (s: ScheduleStaff) => {
    const existAsg = dayAssignments.find((a) => a.staffId === s.id);
    if (existAsg) {
      const existShift = shifts.find((sh) => sh.id === existAsg.shiftId);
      const newStart = shift?.startTime?.slice(0, 5);
      const newEnd = shift?.endTime?.slice(0, 5);
      const existStart = existShift?.startTime?.slice(0, 5);
      const existEnd = existShift?.endTime?.slice(0, 5);
      const isOverlap = newStart && newEnd && existStart && existEnd && (newStart < existEnd && newEnd > existStart);

      if (isOverlap) {
        return `${s.fullName || s.email} (⚠ Trùng ca: ${existShift?.name || existAsg.shiftId})`;
      }
      return `${s.fullName || s.email} (Đã có ca: ${existShift?.name || existAsg.shiftId})`;
    }
    return s.fullName || s.email;
  };

  return (
    <Modal
      open={open}
      onCancel={() => { reset(); onClose(); }}
      title="Phân ca trực"
      width={420}
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <Button onClick={() => { reset(); onClose(); }} disabled={saving}>Hủy</Button>
          <Button
            type="primary"
            loading={saving}
            disabled={availableStaff.length === 0}
            onClick={handleAssign}
          >
            Xếp ca
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", gap: 8, marginBottom: 16, fontSize: "0.75rem" }}>
        <span style={{ color: isDark ? "#B8B0A4" : "#344054" }}>Ngày: {date}</span>
        <span style={{ color: isDark ? "#D4AF37" : "#8B0000", fontWeight: 700 }}>Ca: {shiftName}</span>
        {shift && (
          <span style={{ color: isDark ? "#B8B0A4" : "#999" }}>
            {shift.startTime?.slice(0, 5)} – {shift.endTime?.slice(0, 5)}
          </span>
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        initialValues={{ zoneId: undefined, staffId: undefined, forceSave: false }}
        requiredMark={false}
        size="middle"
      >
        <Form.Item
          name="zoneId"
          label="Khu vực"
          rules={[{ required: true, message: "Vui lòng chọn khu vực" }]}
        >
          <Select
            placeholder="Chọn khu vực"
            options={zones.map((z) => ({ value: z.id, label: z.zoneName }))}
            allowClear
          />
        </Form.Item>

        <Form.Item
          name="staffId"
          label={
            <span>
              Nhân viên
              {availableStaff.length < staff.length && (
                <span style={{ fontWeight: 400, color: isDark ? "#B8B0A4" : "#999", marginLeft: 4 }}>
                  ({staff.length - availableStaff.length} đã xếp)
                </span>
              )}
            </span>
          }
          rules={[{ required: true, message: "Vui lòng chọn nhân viên" }]}
        >
          <Select
            placeholder="Chọn nhân viên"
            options={availableStaff.map((s) => ({ value: s.id, label: getStaffLabel(s) }))}
            notFoundContent="Tất cả nhân viên đã được xếp"
            allowClear
          />
        </Form.Item>
      </Form>

      {error && <Alert message={error} type="error" showIcon closable onClose={() => setError(null)} style={{ marginBottom: 12 }} />}

      {warnings.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Alert
            type="warning"
            showIcon
            description={warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
            style={{ marginBottom: 8 }}
          />
          <Checkbox checked={forceSave} onChange={(e) => setForceSave(e.target.checked)}>
            Vẫn xếp ca bất chấp cảnh báo
          </Checkbox>
        </div>
      )}

      {contextHolder}
    </Modal>
  );
}
