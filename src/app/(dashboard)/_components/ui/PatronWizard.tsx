"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Avatar,
  Box,
  Dialog,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import MuiButton from "@mui/material/Button";

import Steps from "antd/es/steps";
import Form from "antd/es/form";
import Input from "antd/es/input";
import Select from "antd/es/select";
import Result from "antd/es/result";
import Spin from "antd/es/spin";
import notification from "antd/es/notification";

import { getErrorMessage } from "@/lib/api-client";
import { initials } from "@/lib/utils";
import api from "@/lib/api-client";
import { StudentCardScanner, type ScannedCardData } from "@/app/(dashboard)/_components/scanner";
import type { CaptureAngle } from "@/app/(dashboard)/_components/MultiAngleCapture";
import MultiAngleCapture from "@/app/(dashboard)/_components/MultiAngleCapture";
import type { PatronPublic } from "@/lib/types";

const _RAW_CAM_URL = process.env.NEXT_PUBLIC_BORROW_CAM_URL;
const CARD_CAM_URL = _RAW_CAM_URL ? `/api/camera/proxy?url=${encodeURIComponent(_RAW_CAM_URL)}` : "";

const { Option } = Select;

function QrCodeSvg({ value }: { value: string }) {
  const size = 120;
  const cellSize = 4;
  const cells = value.split("").map((_, i) => ({
    x: (i % 25) * cellSize,
    y: Math.floor(i / 25) * cellSize,
    visible: (value.charCodeAt(i) + i) % 3 !== 0,
  }));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${25 * cellSize} ${25 * cellSize}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={25 * cellSize} height={25 * cellSize} fill="white" rx={4} />
      {cells.filter((c) => c.visible).map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={cellSize} height={cellSize} fill="black" rx={0.5} />
      ))}
      {[[0, 0], [18, 0], [0, 18]].map(([ox, oy], i) => (
        <g key={`finder-${i}`}>
          <rect x={ox} y={oy} width={7 * cellSize} height={7 * cellSize} fill="black" rx={1} />
          <rect x={ox + cellSize} y={oy + cellSize} width={5 * cellSize} height={5 * cellSize} fill="white" rx={0.5} />
          <rect x={ox + 2 * cellSize} y={oy + 2 * cellSize} width={3 * cellSize} height={3 * cellSize} fill="black" rx={0.5} />
        </g>
      ))}
    </svg>
  );
}

interface PatronWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function PatronWizard({ open, onClose, onComplete }: PatronWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [scannedFromCard, setScannedFromCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newPatron, setNewPatron] = useState<PatronPublic | null>(null);
  const [consent, setConsent] = useState(false);
  const [apiAnt, contextHolder] = notification.useNotification();

  useEffect(() => {
    if (!open) {
      setCurrentStep(0);
      form.resetFields();
      setScannedFromCard(false);
      setSubmitting(false);
      setNewPatron(null);
      setConsent(false);
    }
  }, [open, form]);

  useEffect(() => {
    if (open && currentStep === 1) {
      const studentCode = form.getFieldValue("studentCode") || "";
      const course = form.getFieldValue("course") || "";
      let startYear = 0;
      let endYear = 0;
      const years = course.match(/\b(20\d{2})\b/g);
      if (years && years.length > 0) {
        startYear = parseInt(years[0]);
        endYear = years.length > 1 ? parseInt(years[1]) : startYear + 4;
      } else if (studentCode && studentCode.match(/^(1[0-9]|2[0-9])/)) {
        const prefix = parseInt(studentCode.substring(0, 2));
        startYear = 2000 + prefix;
        endYear = startYear + 4;
      }
      if (startYear > 0 && endYear > 0) {
        form.setFieldsValue({
          issueDate: `${startYear}-09-01`,
          membershipExpiry: `${endYear}-09-01`,
        });
      }
    }
  }, [currentStep, open, form]);

  const handleCardScanned = useCallback((data: ScannedCardData) => {
    form.setFieldsValue({
      fullName: data.fullName || "",
      studentCode: data.studentCode || "",
      className: data.className || "",
      course: data.course || "",
      permanentAddress: data.permanentAddress || "",
    });
    setScannedFromCard(true);
    setTimeout(() => setCurrentStep(1), 600);
  }, [form]);

  const handleFormSubmit = async () => {
    try {
      const values = await form.validateFields();
      setCurrentStep(2);
    } catch {
      // validation failed — AntD Form shows errors automatically
    }
  };

  const handleSkipFace = async () => {
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const patron = await api.createPatron({
        full_name: values.fullName,
        student_code: values.studentCode,
        class_name: values.className || undefined,
        course: values.course || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        identity_number: values.identityNumber || undefined,
        permanent_address: values.permanentAddress || undefined,
        issue_date: values.issueDate || undefined,
        membership_expiry: values.membershipExpiry || undefined,
      });
      setNewPatron(patron);
      setCurrentStep(3);
      onComplete();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        apiAnt.error({ title: "Trùng dữ liệu", description: "MSSV hoặc mã thẻ đã tồn tại trong hệ thống." });
      } else if (err?.response) {
        apiAnt.error({ title: "Lỗi tạo độc giả", description: getErrorMessage(err) || "Vui lòng thử lại." });
      }
      // else: validation error — AntD Form shows inline errors
    } finally {
      setSubmitting(false);
    }
  };

  const handleFaceReady = async (files: Record<CaptureAngle, File>) => {
    setSubmitting(true);
    try {
      const values = await form.validateFields();
      const patron = await api.createPatron({
        full_name: values.fullName,
        student_code: values.studentCode,
        class_name: values.className || undefined,
        course: values.course || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        identity_number: values.identityNumber || undefined,
        permanent_address: values.permanentAddress || undefined,
        issue_date: values.issueDate || undefined,
        membership_expiry: values.membershipExpiry || undefined,
      });
      await api.enrollPatronFaceBatch(patron.id, files);
      setNewPatron(patron);
      setCurrentStep(3);
      onComplete();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        apiAnt.error({ title: "Trùng dữ liệu", description: "MSSV hoặc mã thẻ đã tồn tại trong hệ thống." });
      } else if (err?.response) {
        apiAnt.error({ title: "Lỗi tạo độc giả", description: getErrorMessage(err) || "Vui lòng thử lại." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendEmail = () => {
    apiAnt.info({
      title: "Tính năng đang phát triển",
      description: "Hệ thống gửi email tự động đang được xây dựng.",
      placement: "bottomRight",
    });
  };

  const handleResetWizard = () => {
    setCurrentStep(0);
    form.resetFields();
    setScannedFromCard(false);
    setNewPatron(null);
  };

  const steps = [
    { title: "Quét thẻ" },
    { title: "Xác minh" },
    { title: "Khuôn mặt" },
    { title: "Hoàn tất" },
  ];

  return (
    <Dialog open={open} onClose={onClose} fullScreen slotProps={{ paper: { sx: { bgcolor: "background.default" } } }}>
      {contextHolder}

      {/* Header — MUI Layout */}
      <Box sx={{ p: 3, borderBottom: 1, borderColor: "divider", bgcolor: "background.paper", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Cấp Phát Thẻ Độc Giả</Typography>
        <MuiButton color="inherit" onClick={onClose} startIcon={<CloseIcon />}>Đóng</MuiButton>
      </Box>

      {/* AntD Steps — Tree-shaken import */}
      <Box sx={{ py: 3, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider" }}>
        <Box sx={{ maxWidth: 800, mx: "auto", px: 4 }}>
          <Steps current={currentStep} items={steps} />
        </Box>
      </Box>

      <DialogContent sx={{ p: 4, display: "flex", justifyContent: "center" }}>
        <Box sx={{ width: "100%", maxWidth: 1000 }}>

          {/* BƯỚC 1: QUÉT THẺ */}
          {currentStep === 0 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Quét thẻ sinh viên</Typography>
                <Typography variant="body2" color="text.secondary">Đặt thẻ sinh viên vào camera để hệ thống tự động trích xuất thông tin.</Typography>
              </Box>
              <Box sx={{ borderRadius: 3, overflow: "hidden", border: "2px dashed", borderColor: "divider", bgcolor: "grey.50" }}>
                <StudentCardScanner
                  onScanned={handleCardScanned}
                  onError={(msg) => apiAnt.warning({ title: "Lỗi quét thẻ", description: msg })}
                  onSkip={() => setCurrentStep(1)}
                  videoSource="ipcamera"
                  ipCameraUrl={CARD_CAM_URL}
                />
              </Box>
            </Stack>
          )}

          {/* BƯỚC 2: XÁC MINH THÔNG TIN — AntD Form */}
          <Box sx={{ display: currentStep === 1 ? 'block' : 'none' }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Xác minh thông tin</Typography>
                {scannedFromCard ? (
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    Đã trích xuất thông tin từ thẻ sinh viên. Vui lòng kiểm tra lại.
                  </Typography>
                ) : (
                  <Typography variant="body2" color="text.secondary">Vui lòng điền thông tin chi tiết của độc giả mới.</Typography>
                )}
              </Box>

              <Form
                form={form}
                layout="vertical"
                onFinish={handleFormSubmit}
                initialValues={{
                  fullName: "",
                  studentCode: "",
                  className: "",
                  course: "",
                  email: "",
                  phone: "",
                  identityNumber: "",
                  permanentAddress: "",
                  issueDate: new Date().toISOString().split("T")[0],
                  membershipExpiry: (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split("T")[0]; })(),
                }}
                validateTrigger={["onChange", "onBlur"]}
              >
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
                      Thông tin học vụ
                    </Typography>
                    <Stack spacing={0}>
                      <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: "Vui lòng nhập họ tên" }]} style={{ marginBottom: 16 }}>
                        <Input size="large" placeholder="Nguyễn Văn A" />
                      </Form.Item>
                      <Form.Item name="studentCode" label="MSSV" rules={[{ required: true, message: "Vui lòng nhập MSSV" }, { pattern: /^[A-Za-z0-9]+$/, message: "MSSV chỉ包含 chữ và số" }]} style={{ marginBottom: 16 }}>
                        <Input size="large" placeholder="12345678" />
                      </Form.Item>
                      <Form.Item name="course" label="Khóa học" style={{ marginBottom: 16 }}>
                        <Input size="large" placeholder="K19" />
                      </Form.Item>
                      <Form.Item name="className" label="Lớp" style={{ marginBottom: 16 }}>
                        <Input size="large" placeholder="DTVT19" />
                      </Form.Item>
                    </Stack>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, fontSize: "0.75rem" }}>
                      Cấp quyền thư viện
                    </Typography>
                    <Stack spacing={0}>
                      <Form.Item name="email" label="Email" rules={[{ type: "email", message: "Email không hợp lệ" }]} style={{ marginBottom: 16 }}>
                        <Input size="large" placeholder="email@iuh.edu.vn" />
                      </Form.Item>
                      <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^[0-9]{10}$/, message: "SĐT phải 10 chữ số" }]} style={{ marginBottom: 16 }}>
                        <Input size="large" placeholder="0901234567" />
                      </Form.Item>
                      <Form.Item name="identityNumber" label="CMND/CCCD" style={{ marginBottom: 16 }}>
                        <Input size="large" placeholder="001234567890" />
                      </Form.Item>
                      <Form.Item name="permanentAddress" label="Hộ khẩu thường trú" style={{ marginBottom: 16 }}>
                        <Input.TextArea size="large" rows={2} placeholder="TP. Thủ Dầu Một, Bình Dương" />
                      </Form.Item>
                    </Stack>
                  </Box>
                </Box>

                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
                  <Form.Item name="issueDate" label="Ngày cấp thẻ" style={{ marginBottom: 16 }}>
                    <Input type="date" size="large" />
                  </Form.Item>
<Form.Item name="membershipExpiry" label="Hạn thẻ" rules={[{ required: true, message: "Vui lòng chọn hạn thẻ" }]} style={{ marginBottom: 16 }}>
  <Input type="date" size="large" />
</Form.Item>
                </Box>

                <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end", pt: 2 }}>
                  <MuiButton variant="outlined" onClick={() => setCurrentStep(0)} sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}>Quay lại</MuiButton>
                  <MuiButton variant="contained" type="submit" sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}>Tiếp tục</MuiButton>
                </Stack>
              </Form>
            </Stack>
          </Box>

          {/* BƯỚC 3: KHUÔN MẶT */}
          {currentStep === 2 && (
            <Stack spacing={3}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Thu thập khuôn mặt</Typography>
                <Typography variant="body2" color="text.secondary">Hướng mặt về phía camera để hệ thống thu thập dữ liệu sinh trắc học.</Typography>
              </Box>
              <Box sx={{ borderRadius: 3, overflow: "hidden", border: 1, borderColor: "divider", p: 2, bgcolor: "grey.50" }}>
                <MultiAngleCapture consent={consent} setConsent={setConsent} onFilesReady={handleFaceReady} />
              </Box>
              <Stack direction="row" spacing={2} sx={{ justifyContent: "flex-end" }}>
                <MuiButton variant="outlined" onClick={() => setCurrentStep(1)} disabled={submitting} sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}>Quay lại</MuiButton>
                <MuiButton variant="contained" onClick={handleSkipFace} disabled={submitting} sx={{ borderRadius: 2, px: 4, fontWeight: 700 }}>
                  {submitting ? <Spin size="small" /> : "Tạo (Bỏ qua Face)"}
                </MuiButton>
              </Stack>
            </Stack>
          )}

          {/* BƯỚC 4: HOÀN TẤT — AntD Result + MUI Virtual Card */}
          {currentStep === 3 && newPatron && (
            <Stack spacing={4} sx={{ alignItems: "center", py: 4 }}>
              <Result
                status="success"
                title="Cấp Phát Thẻ Thành Công!"
                subTitle="Sinh viên đã có thể sử dụng khuôn mặt để qua cổng an ninh."
                extra={[
                  <MuiButton
                    key="next"
                    variant="contained"
                    onClick={handleResetWizard}
                    sx={{ borderRadius: 2, px: 4, fontWeight: 700, background: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)", "&:hover": { background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" } }}
                  >
                    Cấp thẻ tiếp theo
                  </MuiButton>,
                  <MuiButton
                    key="email"
                    variant="outlined"
                    onClick={handleSendEmail}
                    sx={{ borderRadius: 2, px: 4, fontWeight: 600 }}
                  >
                    Gửi qua Email
                  </MuiButton>,
                ]}
              />

              {/* Virtual Card — MUI Paper + SVG QR */}
              <Box sx={{
                width: 420, aspectRatio: "1.586", borderRadius: 4, color: "white", p: 3,
                background: "linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden",
              }}>
                <Box sx={{ position: "absolute", bottom: -20, right: -20, opacity: 0.1 }}>
                  <svg width={160} height={160}><rect width={160} height={160} fill="white" rx={16} /></svg>
                </Box>
                <Stack direction="row" spacing={3} sx={{ alignItems: "center", height: "100%", zIndex: 1, position: "relative" }}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: "rgba(255,255,255,0.2)", fontSize: 24, fontWeight: 700, border: "2px solid rgba(255,255,255,0.4)" }}>
                    {initials(newPatron.full_name)}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, fontSize: "0.95rem" }}>{newPatron.full_name}</Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, fontFamily: "monospace", mt: 0.3 }}>{newPatron.student_code}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7, mt: 0.2, display: "block" }}>{newPatron.class_name || ""}</Typography>
                  </Box>
                  <QrCodeSvg value={newPatron.student_code || newPatron.id} />
                </Stack>
              </Box>
            </Stack>
          )}

        </Box>
      </DialogContent>
    </Dialog>
  );
}
