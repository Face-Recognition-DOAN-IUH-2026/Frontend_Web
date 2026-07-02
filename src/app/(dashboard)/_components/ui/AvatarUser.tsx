import { Avatar, Stack, Typography } from "@mui/material";
import { initials, stringToColor } from "@/lib/utils";

interface AvatarUserProps {
  name?: string;
  email?: string;
  avatarUrl?: string;
  size?: number;
  showName?: boolean;
}

export default function AvatarUser({
  name,
  email,
  avatarUrl,
  size = 40,
  showName = false,
}: AvatarUserProps) {
  const displayName = name || email?.split("@")[0] || "User";
  const color = stringToColor(displayName);

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      <Avatar
        src={avatarUrl || undefined}
        sx={{
          width: size,
          height: size,
          bgcolor: color,
          color: "common.white",
          fontWeight: 700,
          fontSize: size * 0.4,
        }}
      >
        {initials(displayName)}
      </Avatar>
      {showName && (
        <Stack spacing={0}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {name || email?.split("@")[0] || "User"}
          </Typography>
          {email && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {email}
            </Typography>
          )}
        </Stack>
      )}
    </Stack>
  );
}
