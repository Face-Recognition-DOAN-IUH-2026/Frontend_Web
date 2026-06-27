"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  User,
  Mail,
  Shield,
  Fingerprint,
  Hash,
  Loader2,
  AlertCircle,
} from "lucide-react";
import api from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { UserPublic } from "@/lib/types";
import * as THREE from "three";

/* ─────────────── Three.js floating particles background ─────────────── */
function ParticleBackground() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const w = el.clientWidth;
    const h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = 5;

    /* Floating torus knot */
    const knotGeo = new THREE.TorusKnotGeometry(1.1, 0.32, 160, 24);
    const knotMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      metalness: 0.6,
      roughness: 0.2,
      wireframe: false,
      transparent: true,
      opacity: 0.18,
    });
    const knot = new THREE.Mesh(knotGeo, knotMat);
    knot.position.set(3.5, 0, -2);
    scene.add(knot);

    /* Wireframe sphere */
    const sphereGeo = new THREE.SphereGeometry(0.9, 24, 24);
    const sphereMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.set(-3.5, 1, -1);
    scene.add(sphere);

    /* Particle field */
    const count = 280;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      positions[i] = (Math.random() - 0.5) * 14;
    }
    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0x818cf8,
      size: 0.035,
      transparent: true,
      opacity: 0.55,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    /* Lights */
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dLight = new THREE.DirectionalLight(0x6366f1, 1.2);
    dLight.position.set(2, 3, 2);
    scene.add(dLight);
    const pLight = new THREE.PointLight(0x38bdf8, 0.8, 10);
    pLight.position.set(-3, 2, 1);
    scene.add(pLight);

    let raf: number;
    const clock = new THREE.Clock();
    const animate = () => {
      raf = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      knot.rotation.x = t * 0.18;
      knot.rotation.y = t * 0.25;
      sphere.rotation.y = t * 0.12;
      sphere.rotation.x = t * 0.08;
      particles.rotation.y = t * 0.04;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = el.clientWidth;
      const nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="absolute inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    />
  );
}

/* ─────────────── helpers ─────────────── */
function roleLabel(role: string) {
  if (role === "admin") return "Quản trị viên";
  if (role === "staff") return "Nhân viên";
  return "Độc giả";
}

function roleBadge(role: string) {
  if (role === "admin")
    return "bg-rose-500/10 border border-rose-500/20 text-rose-400";
  if (role === "staff")
    return "bg-amber-500/10 border border-amber-500/20 text-amber-400";
  return "bg-blue-500/10 border border-blue-500/20 text-blue-400";
}

function statusBadge(status?: string) {
  if (status === "active")
    return "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
  if (status === "deleted")
    return "bg-red-500/10 border border-red-500/20 text-red-400";
  return "bg-slate-500/10 border border-slate-500/20 text-slate-400";
}

/* ─────────────── Row field ─────────────── */
function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 py-4 border-b border-white/5 last:border-0">
      <span className="mt-0.5 text-slate-500 flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-widest text-slate-500 mb-0.5">
          {label}
        </p>
        <div className="text-slate-200 text-sm break-all">{value}</div>
      </div>
    </div>
  );
}

/* ─────────────── Main page ─────────────── */
export default function UserDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [user, setUser] = useState<UserPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.push("/login");
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        try {
          const userData = await api.getUser(id);
          setUser(userData);
        } catch {
          const list = await api.listUsers();
          const found = list.users.find((u) => u.id === id);
          if (found) {
            setUser(found);
          } else {
            setError("Không tìm thấy hồ sơ người dùng.");
          }
        }
      } catch {
        setError("Lỗi khi tải dữ liệu người dùng.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (authLoading || loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="p-8 space-y-4">
        <button
          onClick={() => router.push("/dashboard/admin")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
        </button>
        <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {error}
        </div>
      </div>
    );
  }

  if (!user) return null;

  const initials = (user.full_name || user.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative min-h-screen">
      {/* Three.js background */}
      <ParticleBackground />

      <div className="relative z-10 p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Back button */}
        <button
          onClick={() => router.push("/dashboard/admin")}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
          Quay lại danh sách
        </button>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Chi tiết người dùng</h1>
          <p className="text-slate-500 text-sm mt-1">
            ID: <span className="font-mono text-slate-400">{user.id}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Left: Avatar card ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* Profile card */}
            <div className="rounded-2xl border border-white/10 bg-slate-800/70 backdrop-blur-xl p-7 flex flex-col items-center text-center shadow-2xl">
              {/* Avatar circle with gradient ring */}
              <div className="relative mb-5">
                <div className="h-24 w-24 rounded-full p-0.5 bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 shadow-lg shadow-indigo-500/30">
                  <div className="h-full w-full rounded-full bg-slate-800 flex items-center justify-center overflow-hidden">
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-2xl font-bold text-slate-200">{initials}</span>
                    )}
                  </div>
                </div>
                {/* Online / status dot */}
                <span
                  className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-slate-800 ${
                    user.status === "active" ? "bg-emerald-400" : "bg-red-400"
                  }`}
                />
              </div>

              <h2 className="text-xl font-bold text-slate-100 leading-tight">
                {user.full_name || "Chưa cập nhật"}
              </h2>
              <p className="text-slate-400 text-sm mt-1 mb-3 truncate max-w-full">{user.email}</p>

              <div className="flex flex-wrap gap-2 justify-center">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${roleBadge(user.role)}`}>
                  {roleLabel(user.role)}
                </span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusBadge(user.status)}`}>
                  {user.status === "active" ? "Hoạt động" : user.status === "deleted" ? "Đã xóa" : user.status ?? "—"}
                </span>
              </div>

              {/* Biometric indicator */}
              <div className="mt-6 w-full border-t border-white/10 pt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  <Fingerprint className="h-4 w-4" />
                  Sinh trắc học
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    user.has_face
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-slate-500/10 border border-slate-600/30 text-slate-500"
                  }`}
                >
                  {user.has_face ? "Đã đăng ký" : "Chưa đăng ký"}
                </span>
              </div>
            </div>

            {/* ID card mini */}
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-900/40 to-slate-800/80 backdrop-blur-xl p-5 shadow-xl overflow-hidden relative">
              {/* Decorative circle */}
              <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
              <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 mb-1">
                IUH University Library
              </p>
              <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-4">
                ID No. {user.id.split("-")[0].toUpperCase()}
              </p>
              <p className="font-bold text-slate-200 uppercase tracking-wide truncate">
                {user.full_name || "UNNAMED"}
              </p>
              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{user.email}</p>

              {/* Fake barcode */}
              <div className="mt-4 flex gap-[2px] h-7 opacity-40">
                {Array.from({ length: 40 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-indigo-300"
                    style={{ width: i % 3 === 0 ? 3 : 1.5, height: "100%" }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Right: System record & edit ── */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-slate-800/70 backdrop-blur-xl p-7 shadow-2xl h-full">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-indigo-400" />
                  Thông tin hệ thống
                </h3>
              </div>

              {/* ── View mode only ── */}
              <div className="animate-in fade-in duration-200 divide-y divide-white/5">
                  <Field
                    icon={<User className="h-4 w-4" />}
                    label="Họ và tên"
                    value={user.full_name || <span className="text-slate-600 italic">Chưa cập nhật</span>}
                  />
                  <Field
                    icon={<Mail className="h-4 w-4" />}
                    label="Địa chỉ email"
                    value={user.email}
                  />
                  <Field
                    icon={<Shield className="h-4 w-4" />}
                    label="Vai trò trong hệ thống"
                    value={
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-block ${roleBadge(user.role)}`}>
                        {roleLabel(user.role)}
                      </span>
                    }
                  />
                  <Field
                    icon={<Fingerprint className="h-4 w-4" />}
                    label="Trạng thái sinh trắc học"
                    value={
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 ${user.has_face ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-slate-500/10 border border-slate-600/30 text-slate-500"}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${user.has_face ? "bg-emerald-400" : "bg-slate-500"}`} />
                        {user.has_face ? "Đã đăng ký khuôn mặt" : "Chưa đăng ký"}
                      </span>
                    }
                  />
                  <Field
                    icon={<Hash className="h-4 w-4" />}
                    label="UUID người dùng"
                    value={<span className="font-mono text-xs text-slate-400 break-all">{user.id}</span>}
                  />
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
