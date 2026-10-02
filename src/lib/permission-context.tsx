"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './auth-context';
import api from './api-client';
import type {
  SystemResource,
  CrudAction,
  EffectivePermissions,
} from './types';

interface PermissionContextType {
  permissions: EffectivePermissions | null;
  loading: boolean;
  can: (resource: SystemResource, action: CrudAction) => boolean;
  canAccessPage: (path: string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<EffectivePermissions | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const userId = user?.id;
  const userRole = user?.role;

  const refreshPermissions = useCallback(async () => {
    if (!userId) {
      setPermissions(null);
      setLoading(false);
      return;
    }

    // Admin bypass: always granted full permissions
    if (userRole === "admin") {
      setPermissions({
        role: "admin",
        isCustom: false,
        allowedPages: [
          "/dashboard",
          "/books",
          "/patrons",
          "/borrow",
          "/return",
          "/gate",
          "/history",
          "/active",
          "/staff-schedules",
          "/ai-assistant",
          "/enroll",
          "/verify",
          "/identify",
          "/liveness",
          "/library/vr-tour",
          "/profile",
          "/notifications",
          "/dashboard/admin",
          "/dynamic-admin",
          "/settings",
          "/stats",
        ],
        crud: {
          books: { create: true, read: true, update: true, delete: true, approve: true, print: true },
          patrons: { create: true, read: true, update: true, delete: true, approve: true, print: true },
          borrows: { create: true, read: true, update: true, delete: true, approve: true, print: true },
          schedules: { create: true, read: true, update: true, delete: true, approve: true, print: true },
          ai_tools: { create: true, read: true, update: true, delete: true, approve: true, print: true },
          settings: { create: true, read: true, update: true, delete: true, approve: true, print: true },
          stats: { create: true, read: true, update: true, delete: true, approve: true, print: true },
        },
      });
      setLoading(false);
      return;
    }

    try {
      setLoading((prev) => (permissions ? false : true));
      const res = await api.getMyPermissions();
      setPermissions(res);
    } catch (err: any) {
      console.warn("[PermissionProvider] Could not fetch permissions, fallback to defaults:", err.message);
      // Fallback baseline for staff
      if (userRole === "staff") {
        setPermissions({
          role: "staff",
          isCustom: false,
          allowedPages: [
            "/dashboard",
            "/books",
            "/patrons",
            "/borrow",
            "/return",
            "/gate",
            "/history",
            "/active",
            "/staff-schedules",
            "/ai-assistant",
            "/enroll",
            "/verify",
            "/identify",
            "/liveness",
            "/library/vr-tour",
            "/profile",
            "/notifications",
            "/stats",
          ],
          crud: {
            books: { create: true, read: true, update: true, delete: false, approve: false, print: true },
            patrons: { create: true, read: true, update: true, delete: false, approve: true, print: true },
            borrows: { create: true, read: true, update: true, delete: false, approve: true, print: true },
            schedules: { create: false, read: true, update: false, delete: false, approve: false, print: true },
            ai_tools: { create: true, read: true, update: true, delete: false, approve: false, print: false },
            settings: { create: false, read: false, update: false, delete: false, approve: false, print: false },
            stats: { create: false, read: true, update: false, delete: false, approve: false, print: true },
          },
        });
      }
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    refreshPermissions();
  }, [refreshPermissions]);

  const can = useCallback(
    (resource: SystemResource, action: CrudAction): boolean => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (!permissions || !permissions.crud || !permissions.crud[resource]) {
        return false;
      }
      return Boolean(permissions.crud[resource][action]);
    },
    [user, permissions]
  );

  const canAccessPage = useCallback(
    (path: string): boolean => {
      if (!user) return false;
      if (user.role === 'admin') return true;

      // Base path match (e.g. /books matches /books/123)
      const targetPath = path.split('?')[0].split('#')[0];

      // /dashboard/admin requires explicit permission if not admin
      if (targetPath === '/dashboard/admin' || targetPath.startsWith('/dashboard/admin/')) {
        return Boolean(permissions?.allowedPages?.includes('/dashboard/admin'));
      }

      if (!permissions || !permissions.allowedPages) {
        // Fallback for staff
        if (
          user.role === 'staff' &&
          targetPath !== '/dynamic-admin' &&
          targetPath !== '/settings'
        ) {
          return true;
        }
        return false;
      }

      // Exact match or prefix match
      return permissions.allowedPages.some(
        (allowed) => targetPath === allowed || targetPath.startsWith(`${allowed}/`)
      );
    },
    [user, permissions]
  );

  const contextValue = useMemo(
    () => ({
      permissions,
      loading,
      can,
      canAccessPage,
      refreshPermissions,
    }),
    [permissions, loading, can, canAccessPage, refreshPermissions]
  );

  return (
    <PermissionContext.Provider value={contextValue}>
      {children}
    </PermissionContext.Provider>
  );
}

const DEFAULT_FALLBACK_CONTEXT: PermissionContextType = {
  permissions: {
    role: 'admin',
    isCustom: false,
    allowedPages: [
      '/dashboard',
      '/books',
      '/patrons',
      '/borrow',
      '/return',
      '/gate',
      '/history',
      '/active',
      '/staff-schedules',
      '/ai-assistant',
      '/enroll',
      '/verify',
      '/identify',
      '/liveness',
      '/library/vr-tour',
      '/profile',
      '/notifications',
      '/dashboard/admin',
      '/dynamic-admin',
      '/settings',
      '/stats',
    ],
    crud: {
      books: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      patrons: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      borrows: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      schedules: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      ai_tools: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      settings: { create: true, read: true, update: true, delete: true, approve: true, print: true },
      stats: { create: true, read: true, update: true, delete: true, approve: true, print: true },
    },
  },
  loading: false,
  can: () => true,
  canAccessPage: () => true,
  refreshPermissions: async () => {},
};

export function usePermission() {
  const context = useContext(PermissionContext);
  return context || DEFAULT_FALLBACK_CONTEXT;
}

interface CanProps {
  I?: CrudAction;
  a?: SystemResource;
  page?: string;
  pass?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Declarative component for conditional rendering based on RBAC permissions
 * e.g. <Can I="delete" a="books"> <DeleteButton /> </Can>
 * or <Can page="/settings"> <SettingsTab /> </Can>
 */
export function Can({ I, a, page, pass, fallback = null, children }: CanProps) {
  const { can, canAccessPage } = usePermission();

  let hasPermission = false;

  if (typeof pass === 'boolean') {
    hasPermission = pass;
  } else if (page) {
    hasPermission = canAccessPage(page);
  } else if (I && a) {
    hasPermission = can(a, I);
  }

  if (!hasPermission) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function getPermissionDeniedReason(resource: SystemResource, action: CrudAction): string {
  const resourceNames: Record<SystemResource, string> = {
    books: 'kho sách',
    patrons: 'độc giả',
    borrows: 'mượn / trả sách',
    schedules: 'lịch trực',
    ai_tools: 'công cụ AI',
    settings: 'cài đặt hệ thống',
    stats: 'báo cáo thống kê',
  };
  const actionNames: Record<CrudAction, string> = {
    create: 'thêm mới',
    read: 'xem dữ liệu',
    update: 'chỉnh sửa',
    delete: 'xóa dữ liệu',
    approve: 'phê duyệt',
    print: 'in ấn',
  };
  return `Bạn không có quyền ${actionNames[action] || action} trên ${resourceNames[resource] || resource}. Liên hệ Quản trị viên để được cấp quyền.`;
}

