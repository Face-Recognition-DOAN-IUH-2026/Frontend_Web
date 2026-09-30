"use client";

import { useState } from "react";
import { Avatar, Box, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import { initials, stringToColor } from "@/lib/utils";

const ROLE_GRADIENT: Record<string, string> = {
  admin: "linear-gradient(135deg, #D4AF37 0%, #B89628 100%)",
  staff: "linear-gradient(135deg, #0A2540 0%, #0F3C5C 100%)",
  patron: "linear-gradient(135deg, #8B0000 0%, #700000 100%)",
};

export interface AvatarUserProps {
  user?: {
    full_name?: string | null;
    fullName?: string | null;
    name?: string | null;
    email?: string | null;
    avatar_url?: string | null;
    avatarUrl?: string | null;
    role?: string | null;
  } | null;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  role?: string | null;
  size?: number;
  showName?: boolean;
  showRole?: boolean;
  border?: boolean | string;
  sx?: SxProps<Theme>;
  className?: string;
  onClick?: () => void;
}

export default function AvatarUser({
  user,
  name,
  email,
  avatarUrl,
  role,
  size = 36,
  showName = false,
  showRole = false,
  border = false,
  sx,
  className,
  onClick,
}: AvatarUserProps) {
  const [imgError, setImgError] = useState(false);

  const displayName =
    user?.full_name ||
    user?.fullName ||
    user?.name ||
    name ||
    user?.email ||
    email?.split("@")[0] ||
    "User";

  const rawUrl = user?.avatar_url || user?.avatarUrl || avatarUrl;
  const effectiveAvatarUrl = imgError ? undefined : rawUrl || undefined;
  const effectiveRole = (user?.role || role || "").toLowerCase();

  const bgGradient = ROLE_GRADIENT[effectiveRole] || stringToColor(displayName);

  const borderStyle =
    typeof border === "string"
      ? border
      : border
      ? "2px solid rgba(255,255,255,0.85)"
      : "none";

  const avatarNode = (
    <Avatar
      src={effectiveAvatarUrl}
      slotProps={{
        img: {
          onError: () => setImgError(true),
        },
      }}
      className={className}
      onClick={onClick}
      sx={{
        width: size,
        height: size,
        background: effectiveAvatarUrl ? "transparent" : bgGradient,
        color: "#ffffff",
        fontWeight: 750,
        fontSize: Math.max(10, Math.round(size * 0.38)),
        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        border: borderStyle,
        flexShrink: 0,
        cursor: onClick ? "pointer" : "inherit",
        ...sx,
      }}
    >
      {initials(displayName)}
    </Avatar>
  );

  if (!showName) {
    return avatarNode;
  }

  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center", minWidth: 0 }}>
      {avatarNode}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.3 }} noWrap>
          {displayName}
        </Typography>
        {showRole && effectiveRole ? (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "capitalize", display: "block" }}
            noWrap
          >
            {effectiveRole === "admin"
              ? "Quản trị viên"
              : effectiveRole === "staff"
              ? "Nhân viên"
              : "Độc giả"}
          </Typography>
        ) : email || user?.email ? (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }} noWrap>
            {email || user?.email}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
