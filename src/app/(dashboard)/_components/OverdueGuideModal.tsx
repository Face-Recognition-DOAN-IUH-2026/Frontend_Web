'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Stack,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import QRCodeIcon from '@mui/icons-material/QrCode2';
import PaymentIcon from '@mui/icons-material/Payments';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';

interface OverdueGuideModalProps {
  open: boolean;
  onClose: () => void;
  bookTitle?: string;
  fineAmount?: number;
  daysOverdue?: number;
}

const steps = [
  {
    icon: <QRCodeIcon sx={{ color: '#1976d2' }} />,
    title: '1. Quét mã QR tại quầy',
    description: 'Đến quầy thư viện (Tầng 1, Khu A) và quét mã QR thanh toán.',
  },
  {
    icon: <PaymentIcon sx={{ color: '#f57c00' }} />,
    title: '2. Thanh toán phí quá hạn',
    description: 'Thanh toán phí quá hạn qua ví điện tử hoặc tiền mặt.',
  },
  {
    icon: <LocationOnIcon sx={{ color: '#e53935' }} />,
    title: '3. Trả sách tại quầy',
    description: 'Giao sách cho nhân viên thư viện để họ cập nhật hệ thống.',
  },
  {
    icon: <CheckCircleOutlineIcon sx={{ color: '#2e7d32' }} />,
    title: '4. Mở khóa thẻ',
    description: 'Sau khi thanh toán, thẻ của bạn sẽ được mở khóa tự động.',
  },
];

export default function OverdueGuideModal({
  open,
  onClose,
  bookTitle,
  fineAmount,
  daysOverdue,
}: OverdueGuideModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        backdrop: {
          sx: {
            backdropFilter: 'blur(4px)',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            transition: 'all 280ms cubic-bezier(0.16, 1, 0.3, 1) !important',
          },
        },
        paper: {
          sx: {
            borderRadius: 3,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            transform: 'scale(1)',
            transition: 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1) !important',
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
          p: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>
            Hướng dẫn xử lý phí quá hạn
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
            Làm theo các bước dưới đây để mở khóa thẻ
          </Typography>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'white' }}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3 }}>
        {/* Book info */}
        {bookTitle && (
          <Box
            sx={{
              bgcolor: '#f5f5f5',
              borderRadius: 2,
              p: 2,
              mb: 3,
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
              Sách quá hạn
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {bookTitle}
            </Typography>
            {daysOverdue !== undefined && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Quá hạn {daysOverdue} ngày
              </Typography>
            )}
          </Box>
        )}

        {/* Fine amount */}
        {fineAmount !== undefined && (
          <Box
            sx={{
              background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
              border: '1px solid #ffb74d',
              borderRadius: 2,
              p: 2.5,
              textAlign: 'center',
              mb: 3,
            }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Phí quá hạn cần thanh toán
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#e65100' }}>
              {fineAmount.toLocaleString('vi-VN')}đ
            </Typography>
          </Box>
        )}

        {/* Steps */}
        <Stack spacing={2.5} sx={{ mb: 3 }}>
          {steps.map((step, index) => (
            <Stack key={index} direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  bgcolor: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {step.icon}
              </Box>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {step.description}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Footer info */}
        <Box
          sx={{
            bgcolor: '#e3f2fd',
            borderRadius: 2,
            p: 2,
          }}
        >
          <Typography variant="body2" sx={{ color: '#0d47a1', fontWeight: 500 }}>
            <strong>Lưu ý:</strong> Sau khi thanh toán, vui lòng báo nhân viên thư viện để được mở khóa thẻ. Nếu bạn cần hỗ trợ, vui lòng liên hệ thư viện qua email hoặc số điện thoại trên thẻ thành viên.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
