"use client";

import React, { useState, useEffect, useRef } from "react";
import api from "@/lib/api-client";
import type { UserPublic } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, Mail, Phone, MapPin, Lock, Camera, Check, ShieldCheck, X, KeyRound, AtSign } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function ProfilePage() {
  const { addToast } = useToast();
  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    permanent_address: "",
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Modals state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Password state
  const [passData, setPassData] = useState({ old_password: "", new_password: "", confirm_password: "" });
  const [changingPass, setChangingPass] = useState(false);

  // Email OTP state
  const [emailData, setEmailData] = useState({ new_email: "", code: "" });
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request");
  const [emailLoading, setEmailLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.getCurrentUser();
      setUser(data);
      setFormData({
        full_name: data.full_name || "",
        phone: (data as any).phone || "",
        permanent_address: (data as any).permanentAddress || (data as any).permanent_address || "",
      });
    } catch (error) {
      addToast({ type: "error", title: "Không thể tải thông tin cá nhân" });
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      return addToast({ type: "error", title: "Vui lòng chọn file ảnh" });
    }
    if (file.size > 5 * 1024 * 1024) {
      return addToast({ type: "error", title: "Kích thước ảnh tối đa 5MB" });
    }
    try {
      setUploadingAvatar(true);
      const result = await api.uploadAvatar(file);
      setUser((prev) => prev ? { ...prev, avatar_url: result.avatarUrl } : prev);
      addToast({ type: "success", title: "Cập nhật ảnh đại diện thành công!" });
    } catch (error: any) {
      addToast({ type: "error", title: error.response?.data?.error || "Upload ảnh thất bại" });
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingProfile(true);
      await api.updateProfile(formData);
      addToast({ type: "success", title: "Cập nhật hồ sơ thành công!" });
      fetchProfile();
    } catch (error: any) {
      addToast({ type: "error", title: error.response?.data?.error || "Cập nhật thất bại" });
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passData.new_password !== passData.confirm_password) {
      return addToast({ type: "error", title: "Mật khẩu xác nhận không khớp" });
    }
    if (passData.new_password.length < 6) {
      return addToast({ type: "error", title: "Mật khẩu mới phải ít nhất 6 ký tự" });
    }
    try {
      setChangingPass(true);
      await api.changePassword({
        old_password: passData.old_password,
        new_password: passData.new_password,
      });
      addToast({ type: "success", title: "Đổi mật khẩu thành công!" });
      setShowPasswordModal(false);
      setPassData({ old_password: "", new_password: "", confirm_password: "" });
    } catch (error: any) {
      addToast({ type: "error", title: error.response?.data?.error || "Đổi mật khẩu thất bại" });
    } finally {
      setChangingPass(false);
    }
  };

  const requestEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailData.new_email) return addToast({ type: "error", title: "Vui lòng nhập email mới" });
    try {
      setEmailLoading(true);
      await api.requestEmailChangeOtp({ new_email: emailData.new_email });
      addToast({ type: "success", title: "Đã gửi mã OTP đến email mới" });
      setEmailStep("verify");
    } catch (error: any) {
      addToast({ type: "error", title: error.response?.data?.error || "Không thể gửi OTP" });
    } finally {
      setEmailLoading(false);
    }
  };

  const verifyEmailOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailData.code) return addToast({ type: "error", title: "Vui lòng nhập mã OTP" });
    try {
      setEmailLoading(true);
      await api.verifyAndChangeEmail({
        new_email: emailData.new_email,
        code: emailData.code,
      });
      addToast({ type: "success", title: "Đổi email thành công!" });
      setShowEmailModal(false);
      setEmailData({ new_email: "", code: "" });
      setEmailStep("request");
      fetchProfile();
    } catch (error: any) {
      addToast({ type: "error", title: error.response?.data?.error || "Xác thực thất bại" });
    } finally {
      setEmailLoading(false);
    }
  };

  const roleLabel = (role?: string) => {
    if (role === "admin") return "Quản trị viên";
    if (role === "staff") return "Nhân viên";
    return "Độc giả";
  };

  const roleColor = (role?: string) => {
    if (role === "admin") return "text-rose-400 bg-rose-500/10 border border-rose-500/20";
    if (role === "staff") return "text-amber-400 bg-amber-500/10 border border-amber-500/20";
    return "text-blue-400 bg-blue-500/10 border border-blue-500/20";
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Hồ Sơ Cá Nhân
        </h1>
        <p className="text-slate-400 dark:text-slate-400 mt-2">
          Quản lý thông tin cá nhân và bảo mật tài khoản của bạn.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="md:col-span-1 space-y-4">
          {/* Avatar card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-800/60 backdrop-blur-sm p-6 flex flex-col items-center text-center shadow-lg">
            <div className="relative mb-4 cursor-pointer group" onClick={() => avatarInputRef.current?.click()}>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <div className="h-28 w-28 rounded-full border-4 border-slate-600/50 shadow-xl overflow-hidden bg-slate-700 flex items-center justify-center">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-14 w-14 text-slate-400" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                {uploadingAvatar ? (
                  <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Camera className="text-white h-7 w-7" />
                )}
              </div>
            </div>

            <h2 className="text-lg font-bold text-slate-100 dark:text-slate-100">
              {user?.full_name || "Chưa cập nhật"}
            </h2>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full mt-2 ${roleColor(user?.role)}`}>
              {roleLabel(user?.role)}
            </span>

            <div className="mt-5 w-full space-y-2 border-t border-white/10 pt-4 text-sm text-slate-400">
              <p className="flex items-center gap-2 truncate">
                <Mail className="h-4 w-4 text-slate-500 flex-shrink-0" />
                <span className="truncate">{user?.email}</span>
              </p>
              {(user as any)?.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  {(user as any).phone}
                </p>
              )}
              {(user as any)?.studentCode && (
                <p className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs">MSSV:</span>
                  <span className="font-mono text-slate-300">{(user as any).studentCode}</span>
                </p>
              )}
            </div>
          </div>

          {/* Security card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-800/60 backdrop-blur-sm p-5 shadow-lg">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-indigo-400" />
              Bảo mật tài khoản
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowEmailModal(true)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 transition-all border border-transparent hover:border-blue-500/20"
              >
                <AtSign className="h-4 w-4" />
                Đổi Email
              </button>
              <button
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-slate-300 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all border border-transparent hover:border-indigo-500/20"
              >
                <KeyRound className="h-4 w-4" />
                Đổi Mật Khẩu
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Form */}
        <div className="md:col-span-2">
          <div className="rounded-2xl border border-white/10 bg-white/5 dark:bg-slate-800/60 backdrop-blur-sm p-7 shadow-lg">
            <h3 className="text-base font-semibold text-slate-200 mb-6 pb-4 border-b border-white/10 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-400" />
              Thông tin cơ bản
            </h3>

            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Họ và tên
                  </label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Nguyễn Văn A"
                    className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700/50"
                  />
                </div>

                {/* Email (disabled) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Email
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-slate-700/30 border-slate-600/30 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-xs text-slate-500">
                    Dùng nút &quot;Đổi Email&quot; để thay đổi.
                  </p>
                </div>

                {/* Phone */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Số điện thoại
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0912 345 678"
                    className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700/50"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Địa chỉ thường trú
                  </label>
                  <Input
                    value={formData.permanent_address}
                    onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                    placeholder="12 Nguyễn Văn Bảo, Gò Vấp, TP.HCM"
                    className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20 dark:bg-slate-700/50"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/20 transition-all px-6"
                >
                  {savingProfile ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Lưu thay đổi
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* ====== Change Password Modal ====== */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-800 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-400" />
                Đổi Mật Khẩu
              </h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Mật khẩu hiện tại
                </label>
                <Input
                  type="password"
                  value={passData.old_password}
                  onChange={(e) => setPassData({ ...passData, old_password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Mật khẩu mới
                </label>
                <Input
                  type="password"
                  value={passData.new_password}
                  onChange={(e) => setPassData({ ...passData, new_password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  required
                  className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-600"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Xác nhận mật khẩu mới
                </label>
                <Input
                  type="password"
                  value={passData.confirm_password}
                  onChange={(e) => setPassData({ ...passData, confirm_password: e.target.value })}
                  placeholder="••••••••"
                  required
                  className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-600"
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all border border-slate-600/50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-5 py-2 text-sm rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all disabled:opacity-60 flex items-center gap-2"
                >
                  {changingPass ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Đang lưu...
                    </>
                  ) : (
                    "Cập nhật"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== Change Email Modal ====== */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-800 shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <AtSign className="h-5 w-5 text-blue-400" />
                Đổi Email
              </h3>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailStep("request");
                  setEmailData({ new_email: "", code: "" });
                }}
                className="text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {emailStep === "request" ? (
              <form onSubmit={requestEmailOtp} className="space-y-4">
                <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-300 rounded-xl text-sm">
                  Để đổi email, nhập địa chỉ email mới. Chúng tôi sẽ gửi mã OTP đến đó để xác minh.
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Email hiện tại
                  </label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-slate-700/30 border-slate-600/30 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Email mới
                  </label>
                  <Input
                    type="email"
                    value={emailData.new_email}
                    onChange={(e) => setEmailData({ ...emailData, new_email: e.target.value })}
                    placeholder="email_moi@example.com"
                    required
                    autoFocus
                    className="bg-slate-700/50 border-slate-600/50 text-slate-100 placeholder:text-slate-600"
                  />
                </div>
                <div className="pt-3 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all border border-slate-600/50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading}
                    className="px-5 py-2 text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {emailLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang gửi...
                      </>
                    ) : (
                      "Gửi mã OTP"
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={verifyEmailOtp} className="space-y-5">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-sm text-center">
                  Mã OTP đã được gửi đến{" "}
                  <strong className="text-emerald-200">{emailData.new_email}</strong>
                </div>
                <div className="space-y-2 text-center">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
                    Nhập mã OTP (6 số)
                  </label>
                  <Input
                    type="text"
                    maxLength={6}
                    value={emailData.code}
                    onChange={(e) =>
                      setEmailData({ ...emailData, code: e.target.value.replace(/\D/g, "") })
                    }
                    className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-slate-700/50 border-slate-600/50 text-slate-100"
                    required
                    autoFocus
                  />
                </div>
                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEmailStep("request")}
                    className="px-4 py-2 text-sm rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-all border border-slate-600/50"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={emailLoading || emailData.code.length !== 6}
                    className="px-5 py-2 text-sm rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-all disabled:opacity-60 flex items-center gap-2"
                  >
                    {emailLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Đang xác thực...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Xác thực
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
