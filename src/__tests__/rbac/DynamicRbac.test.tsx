import React from "react";
import { render, screen } from "@testing-library/react";
import {
  ALL_RESOURCES,
  ALL_ACTIONS,
  ALL_ROUTES,
  type SystemResource,
  type CrudAction,
  type RolePermissionConfig,
  type UserPermissionOverride,
  type EffectivePermissions,
} from "../../lib/types";

// Permission algebra testing (pure function mirror)
function resolveEffective(
  role: string,
  baseConfig: RolePermissionConfig,
  override?: UserPermissionOverride | null
): EffectivePermissions {
  if (role === "admin") {
    return {
      role: "admin",
      isCustom: false,
      allowedPages: ALL_ROUTES.map((r) => r.path),
      crud: {
        books: { create: true, read: true, update: true, delete: true },
        patrons: { create: true, read: true, update: true, delete: true },
        borrows: { create: true, read: true, update: true, delete: true },
        schedules: { create: true, read: true, update: true, delete: true },
        ai_tools: { create: true, read: true, update: true, delete: true },
        settings: { create: true, read: true, update: true, delete: true },
        stats: { create: true, read: true, update: true, delete: true },
      },
    };
  }

  if (!override || !override.enabled) {
    return {
      role,
      isCustom: false,
      allowedPages: [...baseConfig.allowedPages],
      crud: JSON.parse(JSON.stringify(baseConfig.crud)),
    };
  }

  const pageSet = new Set<string>(baseConfig.allowedPages);
  (override.grantedPages || []).forEach((p) => pageSet.add(p));
  (override.revokedPages || []).forEach((p) => pageSet.delete(p));

  const effectiveCrud = JSON.parse(JSON.stringify(baseConfig.crud));

  ALL_RESOURCES.forEach((res) => {
    ALL_ACTIONS.forEach((action) => {
      if (override.grantedCrud?.[res]?.[action] === true) {
        effectiveCrud[res][action] = true;
      }
      if (override.revokedCrud?.[res]?.[action] === true) {
        effectiveCrud[res][action] = false;
      }
    });
  });

  return {
    role,
    isCustom: true,
    allowedPages: Array.from(pageSet),
    crud: effectiveCrud,
  };
}

describe("Dynamic RBAC Permissions Engine", () => {
  const staffBaseConfig: RolePermissionConfig = {
    role: "staff",
    label: "Thủ thư",
    allowedPages: ["/dashboard", "/books", "/patrons", "/borrow"],
    crud: {
      books: { create: true, read: true, update: true, delete: false },
      patrons: { create: true, read: true, update: true, delete: false },
      borrows: { create: true, read: true, update: true, delete: false },
      schedules: { create: false, read: true, update: false, delete: false },
      ai_tools: { create: true, read: true, update: true, delete: false },
      settings: { create: false, read: false, update: false, delete: false },
      stats: { create: false, read: true, update: false, delete: false },
    },
  };

  it("admin always has full access to all pages and all CRUD actions", () => {
    const effective = resolveEffective("admin", staffBaseConfig);
    expect(effective.role).toBe("admin");
    expect(effective.allowedPages).toContain("/settings");
    expect(effective.allowedPages).toContain("/dynamic-admin");
    expect(effective.crud.books.delete).toBe(true);
    expect(effective.crud.settings.delete).toBe(true);
  });

  it("staff inherits baseline permissions when no override is present", () => {
    const effective = resolveEffective("staff", staffBaseConfig, null);
    expect(effective.isCustom).toBe(false);
    expect(effective.allowedPages).toEqual(["/dashboard", "/books", "/patrons", "/borrow"]);
    expect(effective.crud.books.create).toBe(true);
    expect(effective.crud.books.delete).toBe(false);
    expect(effective.crud.settings.read).toBe(false);
  });

  it("applies user override: grants extra page and extra CRUD delete permission", () => {
    const override: UserPermissionOverride = {
      enabled: true,
      grantedPages: ["/settings"],
      revokedPages: [],
      grantedCrud: {
        books: { delete: true },
      },
      revokedCrud: {},
    };

    const effective = resolveEffective("staff", staffBaseConfig, override);
    expect(effective.isCustom).toBe(true);
    expect(effective.allowedPages).toContain("/settings");
    expect(effective.crud.books.delete).toBe(true);
  });

  it("applies user override: revokes a baseline page and baseline CRUD create permission", () => {
    const override: UserPermissionOverride = {
      enabled: true,
      grantedPages: [],
      revokedPages: ["/books"],
      grantedCrud: {},
      revokedCrud: {
        books: { create: true },
      },
    };

    const effective = resolveEffective("staff", staffBaseConfig, override);
    expect(effective.isCustom).toBe(true);
    expect(effective.allowedPages).not.toContain("/books");
    expect(effective.crud.books.create).toBe(false);
  });

  it("revocation takes precedence over grant when both are specified", () => {
    const override: UserPermissionOverride = {
      enabled: true,
      grantedPages: ["/books"],
      revokedPages: ["/books"],
      grantedCrud: {
        books: { delete: true },
      },
      revokedCrud: {
        books: { delete: true },
      },
    };

    const effective = resolveEffective("staff", staffBaseConfig, override);
    expect(effective.allowedPages).not.toContain("/books");
    expect(effective.crud.books.delete).toBe(false);
  });
});
