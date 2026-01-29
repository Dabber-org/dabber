"use client";
import { Stack, Typography, useTheme } from "@mui/material";
import Profile from "./Profile";
import { User } from "@/types/session";
import OverViewIcon from "@/icons/sidebar/OverViewIcon";
import Link from "next/link";
import DabberLogoEn from "@/icons/brand/DabberLogoEn";
import { usePathname } from "next/navigation";
import AgentsIcon from "@/icons/sidebar/AgentsIcon";
import NotificationsIcon from "@/icons/sidebar/NotificationsIcon";
import LogsIcon from "@/icons/sidebar/LogsIcon";
import SettingsIcon from "@/icons/sidebar/SettingsIcon";
export default function Sidebar({ user }: { user: User | undefined }) {
  const pathname = usePathname();
  const theme = useTheme();

  return (
    <Stack
      sx={{
        gap: 1.5,
        borderRight: "1px solid #262626",
        height: "100vh",
        width: "15.625rem",
        padding: 1,
      }}
    >
      <DabberLogoEn />
      <Profile user={user} />
      <Stack direction="column" gap={0.5}>
        {SidebarItems.map((item) => (
          <Stack
            component={Link}
            href={item.href}
            className="opacityOnHover-50"
            direction="row"
            alignItems="center"
            paddingInline={0.75}
            paddingBlock={0.34}
            gap={1}
            key={item.label}
            sx={{
              cursor: "pointer",
              backgroundColor:
                containsPath(pathname, item.href) && item.label !== "Overview" ? "#191919" : "transparent",
              borderRadius: "0.5rem",
            }}
          >
            {item.icon(
              containsPath(pathname, item.href) && item.label !== "Overview"
                ? theme.palette.primary.main
                : theme.palette.text.secondary
            )}
            <Typography
              variant="fontMediumSm"
              color={containsPath(pathname, item.href) && item.label !== "Overview" ? "primary" : "text.secondary"}
            >
              {item.label}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}

const SidebarItems = [
  {
    icon: (primaryFill: string) => <OverViewIcon primaryFill={primaryFill} />,
    label: "Overview",
    href: "/agents",
  },
  {
    icon: (primaryFill: string) => <AgentsIcon primaryFill={primaryFill} />,
    label: "Agents",
    href: "/agents",
  },
  {
    icon: (primaryFill: string) => <NotificationsIcon primaryFill={primaryFill} />,
    label: "Notifications",
    href: "/notifications",
  },
  {
    icon: (primaryFill: string) => <LogsIcon primaryFill={primaryFill} />,
    label: "Logs",
    href: "/logs",
  },
  {
    icon: (primaryFill: string) => <SettingsIcon primaryFill={primaryFill} />,
    label: "Settings",
    href: "/settings",
  },
];

const containsPath = (path: string, href: string) => {
  return path.includes(href);
};
