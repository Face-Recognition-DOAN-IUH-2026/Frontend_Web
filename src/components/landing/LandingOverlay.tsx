"use client";

import Link from "next/link";
import { Library, Users, BookOpen, ScanFace, ArrowRight, Compass } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Users,
    title: "Quản lý độc giả",
    desc: "Đăng ký, gia hạn thẻ, tra cứu thông tin bạn đọc toàn thư viện.",
    gradient: "from-blue-500/20 to-blue-600/10",
    iconColor: "text-blue-400",
  },
  {
    icon: BookOpen,
    title: "Mượn / Trả sách",
    desc: "Quét mã vạch, mượn trả nhanh chóng. Hệ thống theo dõi hạn trả và nhắc nhở tự động.",
    gradient: "from-emerald-500/20 to-emerald-600/10",
    iconColor: "text-emerald-400",
  },
  {
    icon: ScanFace,
    title: "Cửa ra vào thông minh",
    desc: "Nhận diện khuôn mặt, kiểm soát ra vào, chống giả mạo và thống kê tần suất.",
    gradient: "from-violet-500/20 to-violet-600/10",
    iconColor: "text-violet-400",
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

export default function LandingOverlay() {
  return (
    <div className="relative z-10 min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0f172a]/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1A73E8] flex items-center justify-center">
              <Library className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold text-white font-display">Thư Viện</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mx-auto max-w-6xl px-4 pt-24 pb-20 text-center"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A73E8]/10 border border-[#1A73E8]/30 text-[#4DA3FF] text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1A73E8] animate-pulse" />
            Hệ thống quản lý thư viện thông minh
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight font-display">
            Chào mừng đến với{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1A73E8] to-[#4DA3FF]">
              Thư Viện
            </span>
          </h1>
          <p className="mt-4 text-lg text-white/50 max-w-xl mx-auto leading-relaxed">
            Nền tảng quản lý thư viện toàn diện — quản lý độc giả, theo dõi mượn trả, và kiểm soát cửa ra vào bằng công nghệ nhận diện khuôn mặt.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#1A73E8] text-white rounded-lg font-medium hover:bg-[#1557B0] transition-colors shadow-lg shadow-[#1A73E8]/25"
            >
              Truy cập hệ thống
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/library/vr-tour"
              className="inline-flex items-center gap-2 px-6 py-3 border border-white/20 hover:border-white/40 text-white rounded-lg font-medium hover:bg-white/5 transition-all shadow-lg"
            >
              <Compass className="w-4 h-4 text-blue-400" />
              Tham quan 3D
            </Link>
          </div>
        </motion.section>

        {/* Feature Cards */}
        <motion.section
          variants={container}
          initial="hidden"
          animate="show"
          className="mx-auto max-w-6xl px-4 pb-24"
        >
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  variants={item}
                  className="group relative rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-[#1A73E8]/5 hover:-translate-y-1"
                >
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} ${f.iconColor} group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-semibold text-white font-display">{f.title}</h3>
                  <p className="mt-2 text-sm text-white/40 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {/* Stats Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mx-auto max-w-6xl px-4 pb-24"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Độc giả", value: "1,200+", color: "text-[#4DA3FF]" },
              { label: "Đầu sách", value: "10,000+", color: "text-[#E6A817]" },
              { label: "Lượt mượn", value: "25,000+", color: "text-[#10B981]" },
              { label: "Lượt ra vào", value: "50,000+", color: "text-[#8B5CF6]" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 rounded-xl border border-white/5 bg-white/[0.02]"
              >
                <div className={`text-2xl sm:text-3xl font-bold font-display ${stat.color}`}>
                  {stat.value}
                </div>
                <div className="text-xs text-white/30 mt-1 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#0f172a]/50">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between text-xs text-white/20">
          <span>© {new Date().getFullYear()} Thư Viện. All rights reserved.</span>
          <span>Phiên bản 1.0</span>
        </div>
      </footer>
    </div>
  );
}
