'use client';

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { libraryTourData, Room, NavigationArrowData } from '@/lib/vr/tourData';
import { 
  ChevronDown, 
  ChevronUp, 
  Menu, 
  Home, 
  Volume2, 
  VolumeX, 
  MapPin, 
  RotateCcw, 
  Info, 
  Maximize2, 
  Minimize2, 
  ChevronLeft,
  ChevronRight,
  Plus,
  Minus,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import AdminTourModal from './AdminTourModal';

// Subcomponent: Perspective Camera Manager to handle smooth zoom (FOV changes)
function CameraManager({ fov }: { fov: number }) {
  const { camera } = useThree();
  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }, [fov, camera]);
  return null;
}

// Subcomponent: NavigationArrow handles its own hover previews and click actions
interface NavigationArrowProps extends NavigationArrowData {
  onNavigate: (roomId: string) => void;
}

function NavigationArrow({
  position,
  rotation,
  targetRoomId,
  label,
  previewUrl,
  onNavigate
}: NavigationArrowProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <group position={position}>
      <Html center>
        <div className="relative flex flex-col items-center justify-center pointer-events-auto">
          
          {/* POPUP PREVIEW: Hiển thị đè lên trên khi hover chuột vào mũi tên */}
          {isHovered && (
            <div className="absolute bottom-24 flex flex-col items-center animate-fade-in z-30">
              {/* Khung chứa ảnh bọc viền xanh đậm bo góc theo chuẩn IUH */}
              <div className="w-64 h-44 bg-blue-800 border-4 border-blue-800 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col">
                <div className="flex-1 w-full h-full relative bg-slate-800 flex items-center justify-center">
                  <img 
                    src={previewUrl} 
                    alt={label} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/400x300/1e293b/ffffff?text=Image+Not+Found';
                    }}
                  />
                </div>
                {/* Thanh banner tiêu đề chữ trắng nền xanh dưới đáy ảnh */}
                <div className="bg-blue-800 py-2 text-center text-white font-bold text-xs tracking-wider uppercase">
                  {label}
                </div>
              </div>
              
              {/* Mũi tên nhọn chỉ xuống của cái khung popup */}
              <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-blue-800 drop-shadow-md" />
            </div>
          )}

          {/* NÚT BẤM MŨI TÊN MÀU VÀNG DƯỚI SÀN */}
          <button
            onClick={() => onNavigate(targetRoomId)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="relative focus:outline-none group cursor-pointer transition-transform duration-200 w-32 h-32 flex items-center justify-center"
          >
            {/* Vòng tròn hiệu ứng radar sóng lan tỏa */}
            <div 
              className="absolute w-28 h-28 bg-amber-400/25 rounded-full animate-ping pointer-events-none left-1/2 top-1/2" 
              style={{ transform: 'translate(-50%, -50%) rotateX(75deg)' }} 
            />

            {/* Mũi tên Caret màu vàng cam nghiêng 3D */}
            <div 
              style={{ transform: `rotateX(55deg) rotateZ(${rotation}deg) scaleY(0.8)` }} 
              className="relative flex items-center justify-center transition-all duration-300 group-hover:scale-110"
            >
              <svg 
                width="120" 
                height="85" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#FFB300" 
                strokeWidth="4.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className="group-hover:stroke-amber-400 drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
              >
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            </div>
          </button>
          
        </div>
      </Html>
    </group>
  );
}

// Subcomponent: VRScene handles mesh rendering, camera setups, loop renders, and memory-safe background texture loading
interface SceneProps {
  room: Room;
  onNavigate: (roomId: string) => void;
  gyroEnabled: boolean;
  resetTrigger: number;
  hotspotsVisible: boolean;
  hideHotspots?: boolean;
}

function VRScene({ room, onNavigate, gyroEnabled, resetTrigger, hotspotsVisible, hideHotspots }: SceneProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);
  const { camera } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const textureRef = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    textureRef.current = texture;
  }, [texture]);

  useEffect(() => {
    return () => {
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, []);
  
  // Load and dispose texture dynamically in background (prevent unmount/flicker and memory leak)
  useEffect(() => {
    setIsTransitioning(true);
    const loader = new THREE.TextureLoader();
    let isMounted = true;

    loader.load(
      room.imageUrl,
      (loadedTexture) => {
        if (!isMounted) {
          loadedTexture.dispose();
          return;
        }
        // Optimize WebGL settings and set sRGB color space to fix overexposed gamma
        loadedTexture.minFilter = THREE.LinearFilter;
        loadedTexture.generateMipmaps = false;
        loadedTexture.colorSpace = THREE.SRGBColorSpace;

        setTexture((prevTexture) => {
          if (prevTexture) {
            prevTexture.dispose();
          }
          return loadedTexture;
        });
        setIsTransitioning(false);
      },
      undefined,
      (err) => {
        console.error('Failed to load texture:', room.imageUrl, err);
        setIsTransitioning(false);
      }
    );

    return () => {
      isMounted = false;
    };
  }, [room.imageUrl]);

  // Set initial camera rotation when texture is ready
  useEffect(() => {
    if (!texture) return;
    camera.position.set(0, 0, 0.1); 
    if (room.defaultRotation) {
      camera.rotation.set(room.defaultRotation[0], room.defaultRotation[1], room.defaultRotation[2]);
    } else {
      camera.rotation.set(0, 0, 0);
    }
  }, [room, texture, camera, resetTrigger]);

  // Push new texture map and update shader compiled flags to prevent black screens
  useEffect(() => {
    if (texture && materialRef.current) {
      materialRef.current.map = texture;
      materialRef.current.needsUpdate = true;
    }
  }, [texture]);

  // Handle mobile gyroscope orientation
  useEffect(() => {
    if (!gyroEnabled) {
      if (groupRef.current) {
        groupRef.current.rotation.set(0, 0, 0);
      }
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (!groupRef.current) return;
      
      const beta = e.beta ? (e.beta * Math.PI) / 180 : 0;
      const gamma = e.gamma ? (e.gamma * Math.PI) / 180 : 0;
      const alpha = e.alpha ? (e.alpha * Math.PI) / 180 : 0;

      groupRef.current.rotation.y = -alpha;
      groupRef.current.rotation.x = beta - Math.PI / 2; 
      groupRef.current.rotation.z = gamma;
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [gyroEnabled]);

  return (
    <group ref={groupRef}>
      {/* 360 Sphere mesh */}
      <mesh scale={[-1, 1, 1]} visible={!!texture}>
        <sphereGeometry args={[500, 60, 40]} />
        <meshBasicMaterial ref={materialRef} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating Canvas Overlay for transition state */}
      {isTransitioning && (
        <Html center zIndexRange={[1000, 2000]}>
          <div className="flex flex-col items-center justify-center p-4 bg-slate-950/85 border border-slate-800/40 backdrop-blur-md rounded-2xl shadow-2xl pointer-events-none">
            <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-white text-xs font-semibold whitespace-nowrap tracking-wide animate-pulse">
              Đang di chuyển...
            </p>
          </div>
        </Html>
      )}

      {/* Loop and render separate NavigationArrow components */}
      {hotspotsVisible && texture && !hideHotspots && room.navigationArrows?.map((arrow) => (
        <NavigationArrow 
          key={arrow.id}
          {...arrow}
          onNavigate={onNavigate}
        />
      ))}
    </group>
  );
}

// Loading component inside the canvas
function CanvasLoader() {
  return (
    <Html center>
      <div className="flex flex-col items-center justify-center p-4 bg-slate-900/80 rounded-2xl border border-slate-700/50 backdrop-blur-md">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-white text-sm font-medium whitespace-nowrap animate-pulse">
          Đang tải không gian 3D...
        </p>
      </div>
    </Html>
  );
}

// Main Component
export default function VRViewer() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'staff';

  const [tourRooms, setTourRooms] = useState<Record<string, Room>>(libraryTourData);
  const [availableImages, setAvailableImages] = useState<string[]>([]);
  const [currentRoomId, setCurrentRoomId] = useState<string>('room1');
  const [adminModalOpen, setAdminModalOpen] = useState<boolean>(false);

  const [isWebView, setIsWebView] = useState<boolean>(false);
  const [gyroEnabled, setGyroEnabled] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [fov, setFov] = useState<number>(75);
  const [hotspotsVisible, setHotspotsVisible] = useState<boolean>(true);
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [infoVisible, setInfoVisible] = useState<boolean>(false);
  const [isToolbarVisible, setIsToolbarVisible] = useState<boolean>(true);
  const [mapVisible, setMapVisible] = useState<boolean>(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Load dynamic rooms from backend API on mount
  const loadTourConfig = () => {
    fetch('/api/vr/rooms')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.rooms) {
          setTourRooms(data.rooms);
          if (data.availableImages) {
            setAvailableImages(data.availableImages);
          }
        }
      })
      .catch((err) => console.warn('Could not load dynamic VR rooms:', err));
  };

  useEffect(() => {
    loadTourConfig();
  }, []);

  const currentRoom = tourRooms[currentRoomId] || Object.values(tourRooms)[0] || libraryTourData.room1;

  useEffect(() => {
    const isUAWebView = typeof window !== 'undefined' && 
      (window.navigator.userAgent.includes('wv') || 
       window.navigator.userAgent.includes('WebView') ||
       !!(window as any).ReactNativeWebView);
    
    setIsWebView(isUAWebView);
  }, []);

  const handleRoomChange = (roomId: string) => {
    setCurrentRoomId(roomId);
    
    if (typeof window !== 'undefined' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(
        JSON.stringify({
          type: 'ROOM_CHANGE',
          payload: { roomId, roomName: tourRooms[roomId]?.name }
        })
      );
    }
  };

  const handleSaveRooms = async (newRooms: Record<string, Room>): Promise<boolean> => {
    try {
      const res = await fetch('/api/vr/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rooms: newRooms }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi lưu phòng');
      }
      setTourRooms(newRooms);
      if (!newRooms[currentRoomId]) {
        setCurrentRoomId(Object.keys(newRooms)[0] || 'room1');
      }
      return true;
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu phòng');
      return false;
    }
  };

  const handleResetDefault = async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/vr/rooms', {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi khôi phục');
      }
      setTourRooms(libraryTourData);
      setCurrentRoomId('room1');
      return true;
    } catch (err: any) {
      alert(err.message || 'Lỗi khi khôi phục mặc định');
      return false;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black select-none overflow-hidden"
    >
      {/* Three.js Canvas */}
      <Canvas camera={{ fov: 75, near: 0.1, far: 1000 }}>
        <CameraManager fov={fov} />
        <Suspense fallback={<CanvasLoader />}>
          <VRScene 
            room={currentRoom} 
            onNavigate={handleRoomChange} 
            gyroEnabled={gyroEnabled}
            resetTrigger={resetTrigger}
            hotspotsVisible={hotspotsVisible}
            hideHotspots={mapVisible || infoVisible || adminModalOpen}
          />
        </Suspense>
        
        <OrbitControls 
          enableZoom={false} 
          enablePan={false} 
          rotateSpeed={-0.4} 
          enabled={!gyroEnabled}
        />
      </Canvas>

      {/* Top Left: Library Badge & Current Room Title */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 pointer-events-auto">
        <div className="px-3.5 py-2 bg-blue-800 border border-blue-700 text-white rounded-lg font-bold text-sm shadow-xl animate-fade-in flex items-center gap-2">
          <span>Thư viện IUH</span>
        </div>
        <div className="hidden sm:flex items-center px-3.5 py-2 bg-slate-900/85 backdrop-blur-md border border-slate-700/60 text-amber-300 rounded-lg font-bold text-xs shadow-lg uppercase tracking-wider">
          {currentRoom.name}
        </div>
      </div>

      {/* Top Right: Admin Management Button (Always visible when admin/staff) */}
      {isAdmin && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setAdminModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 bg-red-800/90 hover:bg-red-700 text-white border border-red-600/60 rounded-xl font-bold text-xs shadow-xl transition-all duration-200 cursor-pointer backdrop-blur-md"
            title="Cài đặt & Quản lý khu vực VR 360°"
          >
            <Settings className="w-4 h-4" />
            <span>Quản trị VR Tour</span>
          </button>
        </div>
      )}

      {/* Bottom Center Toolbar - Chuẩn UI IUH */}
      <div 
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-[#3b5598] rounded-full px-4 sm:px-5 py-2.5 shadow-2xl flex items-center pointer-events-auto max-w-[95vw] overflow-x-auto scrollbar-hide border border-white/20 transition-all duration-300`}
      >
        
        {/* NÚT THU GỌN / MỞ RỘNG TOOLBAR */}
        <button
          onClick={() => setIsToolbarVisible(!isToolbarVisible)}
          className={`w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors ${isToolbarVisible ? 'mr-4 sm:mr-8' : ''}`}
          title={isToolbarVisible ? "Thu gọn thanh công cụ" : "Mở rộng thanh công cụ"}
        >
          {isToolbarVisible ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>

        {/* CÁC CHỨC NĂNG BÊN TRONG (CHỈ HIỂN THỊ KHI TOOLBAR MỞ) */}
        {isToolbarVisible && (
          <>
            {/* CỤM TRÁI: Nút mở Drawer Danh sách phòng */}
            <div className="flex items-center mr-4 sm:mr-8">
              <button
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="Danh sách phòng"
              >
                <Menu className="w-4 h-4" />
              </button>
            </div>

            {/* CỤM GIỮA: Các tính năng chính */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleRoomChange(Object.keys(tourRooms)[0] || 'room1')}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="Về cổng vào"
              >
                <Home className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title={isMuted ? "Bật âm thanh" : "Tắt âm thanh"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => setFov(prev => Math.min(100, prev + 5))}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="Thu nhỏ"
              >
                <Minus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setFov(prev => Math.max(35, prev - 5))}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="Phóng to"
              >
                <Plus className="w-4 h-4" />
              </button>

              <button
                onClick={() => setMapVisible(true)}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="Vị trí thư viện trên bản đồ"
              >
                <MapPin className="w-4 h-4" />
              </button>

              <button
                onClick={() => setResetTrigger(prev => prev + 1)}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="Khôi phục góc nhìn"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                onClick={() => setInfoVisible(!infoVisible)}
                className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                title="Thông tin"
              >
                <Info className="w-4 h-4" />
              </button>

              {/* Nút Admin Settings trên toolbar nếu là admin */}
              {isAdmin && (
                <button
                  onClick={() => setAdminModalOpen(true)}
                  className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-amber-300 bg-red-800 flex items-center justify-center text-white hover:bg-red-700 transition-colors"
                  title="Cài đặt khu vực VR (Admin)"
                >
                  <Settings className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* CỤM PHẢI: Fullscreen */}
            {!isWebView && (
              <div className="flex items-center ml-4 sm:ml-8">
                <button
                  onClick={toggleFullscreen}
                  className="w-9 h-9 shrink-0 rounded-full border-[1.5px] border-white flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                  title={isFullscreen ? 'Thoát toàn màn hình' : 'Bật toàn màn hình'}
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* SIDEBAR BÊN TRÁI - GIAO DIỆN CHUẨN IUH */}
      <div 
        className={`absolute top-0 left-0 h-full w-[300px] sm:w-[350px] bg-[#22408c] z-40 transform transition-transform duration-500 ease-in-out shadow-[10px_0_20px_rgba(0,0,0,0.5)] flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Phần Logo Header Trắng */}
        <div className="bg-white h-[100px] w-full flex items-center justify-center p-4 shrink-0">
          <img
            src="/logo.png"
            alt="IUH Logo"
            className="h-14 w-auto object-contain"
          />
        </div>

        {/* Dải phân cách màu vàng */}
        <div className="w-full h-[6px] bg-[#f8b22a] shrink-0" />

        {/* Danh sách Menu - Chỉ chứa Rooms */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-white/30 scrollbar-track-transparent">
          
          {/* Tiêu đề danh sách */}
          <div className="w-full px-5 py-3 bg-[#1e347b] border-b border-white/20 text-white font-bold text-[13px] uppercase tracking-wide sticky top-0 z-10 shadow-sm flex items-center justify-between">
            <span>Hệ thống phòng thư viện</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20 text-white">
              {Object.keys(tourRooms).length} phòng
            </span>
          </div>

          {/* Danh sách các phòng lấy từ Data */}
          <div className="flex flex-col w-full pb-6">
            {Object.values(tourRooms).map((room) => (
              <button
                key={room.id}
                onClick={() => {
                  handleRoomChange(room.id);
                  if (typeof window !== 'undefined' && window.innerWidth < 640) {
                    setIsDrawerOpen(false);
                  }
                }}
                className={`w-full px-5 py-3.5 text-left text-[14px] border-b border-white/10 transition-colors flex items-center gap-3 ${
                  currentRoomId === room.id 
                    ? 'bg-[#152a65] text-white font-bold' 
                    : 'bg-[#22408c] text-slate-200 hover:bg-[#2a4494] hover:text-white'
                }`}
              >
                <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${currentRoomId === room.id ? 'bg-[#f8b22a]' : 'bg-transparent'}`} />
                <span className="truncate">{room.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Admin Button in Drawer */}
        {isAdmin && (
          <div className="p-3 bg-[#1e347b] border-t border-white/20 shrink-0">
            <button
              onClick={() => {
                setAdminModalOpen(true);
                setIsDrawerOpen(false);
              }}
              className="w-full py-2.5 px-3 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-red-600/40 cursor-pointer shadow-md"
            >
              <Settings className="w-4 h-4" />
              <span>Quản trị khu vực VR (Admin)</span>
            </button>
          </div>
        )}

        {/* Nút Đóng/Mở Sidebar (Nằm lồi ra ngoài viền phải) */}
        <button 
          onClick={() => setIsDrawerOpen(!isDrawerOpen)}
          className="absolute top-1/2 -right-8 -translate-y-1/2 w-8 h-16 bg-[#22408c]/90 backdrop-blur-sm rounded-r-xl border-y border-r border-white/20 flex items-center justify-center text-white hover:bg-[#f8b22a] transition-colors shadow-lg focus:outline-none pointer-events-auto z-50 cursor-pointer"
        >
          {isDrawerOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </div>

      {/* Info Modal Dialog */}
      {infoVisible && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-sm w-full shadow-2xl flex flex-col gap-4">
            <h2 className="text-white text-lg font-bold flex items-center gap-2 border-b border-slate-800 pb-3">
              <Info className="w-5 h-5 text-blue-400" />
              Thông tin Thư viện
            </h2>
            <div className="text-slate-300 text-sm flex flex-col gap-2">
              <p><strong>Địa chỉ:</strong> Thư viện đại học IUH</p>
              <p><strong>Giờ mở cửa:</strong> 07:30 - 21:00 (Thứ 2 - Thứ 7)</p>
              <p><strong>Tham quan 3D:</strong> Sử dụng chuột hoặc vuốt để xoay không gian. Nhấn các mũi tên màu cam trên sàn để di chuyển giữa các khu vực.</p>
            </div>
            <button
              onClick={() => setInfoVisible(false)}
              className="mt-2 w-full py-2 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-300"
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      {/* Map Modal Dialog */}
      {mapVisible && (
        <div className="absolute inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col gap-4 animate-fade-in">
            <h2 className="text-white text-lg font-bold flex items-center gap-2 border-b border-slate-800 pb-3">
              <MapPin className="w-5 h-5 text-blue-400 animate-pulse" />
              Vị trí Thư viện
            </h2>
            <div className="text-slate-300 text-sm flex flex-col gap-3">
              <p className="leading-relaxed">
                <strong>Địa chỉ:</strong> Số 12, đường Nguyễn Văn Bảo, Phường Hạnh Thông, Quận Gò Vấp, TP. Hồ Chí Minh
              </p>
              
              {/* Google Maps Embedded Iframe */}
              <div className="w-full overflow-hidden rounded-2xl bg-slate-950">
                <iframe
                  title="Bản đồ Thư viện IUH"
                  width="100%"
                  height="380"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src="https://maps.google.com/maps?q=12%20Nguy%E1%BB%85n%20V%C4%83n%20B%E1%BA%A3o%2C%20Ph%C6%B0%E1%BB%9Dng%204%2C%20G%C3%B2%20V%E1%BA%A5p%2C%20Th%C3%A0nh%20ph%E1%BB%91%20H%E1%BB%93%20Ch%C3%AD%20Minh&t=&z=15&ie=UTF8&iwloc=&output=embed"
                  className="w-full opacity-90 hover:opacity-100 transition-opacity"
                ></iframe>
              </div>
            </div>
            
            <div className="flex gap-2.5 mt-1">
              <a
                href="https://maps.google.com/?q=12+Nguyễn+Văn+Bảo,+Phường+4,+Gò+Vấp,+Thành+phố+Hồ+Chí+Minh"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-4 bg-slate-850 hover:bg-slate-750 text-slate-200 hover:text-white font-bold rounded-xl text-center text-sm transition-all border border-slate-700/50"
              >
                Mở Google Maps
              </a>
              <button
                onClick={() => setMapVisible(false)}
                className="flex-1 py-2 px-4 bg-blue-800 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin VR Tour Management Modal */}
      <AdminTourModal
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
        rooms={tourRooms}
        currentRoomId={currentRoomId}
        onSelectRoom={(id) => handleRoomChange(id)}
        onSaveRooms={handleSaveRooms}
        onResetDefault={handleResetDefault}
        availableImages={availableImages}
      />
    </div>
  );
}
