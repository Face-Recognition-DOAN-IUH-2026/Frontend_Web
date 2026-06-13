import Link from "next/link";
import { Library, Users, BookOpen, ScanFace, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Quản lý độc giả",
    desc: "Đăng ký, gia hạn thẻ, tra cứu thông tin bạn đọc toàn thư viện.",
  },
  {
    icon: BookOpen,
    title: "Mượn / Trả sách",
    desc: "Quét mã vạch, mượn trả nhanh chóng. Hệ thống theo dõi hạn trả và nhắc nhở tự động.",
  },
  {
    icon: ScanFace,
    title: "Cửa ra vào thông minh",
    desc: "Nhận diện khuôn mặt, kiểm soát ra vào, chống giả mạo và thống kê tần suất.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Library className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold">Thư Viện</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Hệ thống quản lý thư viện thông minh
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 leading-tight tracking-tight">
            Chào mừng đến với{" "}
            <span className="text-primary">Thư Viện</span>
          </h1>
          <p className="mt-4 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Nền tảng quản lý thư viện toàn diện — quản lý độc giả, theo dõi
            mượn trả, và kiểm soát cửa ra vào bằng công nghệ nhận diện khuôn
            mặt.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Truy cập hệ thống
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className="group relative rounded-xl border border-slate-200 bg-white p-6 transition-shadow hover:shadow-md"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 flex items-center justify-between text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Thư Viện. All rights reserved.</span>
          <span>Phiên bản 1.0</span>
        </div>
      </footer>
    </div>
  );
}