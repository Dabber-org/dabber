"use client";
import { User } from "@/types/session";
import { Stack, styled, Typography } from "@mui/material";
import Link from "next/link";
import ProfileImage from "./ProfileImage";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import ProfileArrowIcon from "@/icons/sidebar/ProfileArrowIcon";

export default function Profile({ user }: { user: User | undefined }) {
  // TODO: Make this go to the profile page instead of logging out
  const router = useRouter();
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await authClient.signOut();
    router.push("/login");
  };

  return (
    <ProfileWrapper href="#" className="opacityOnHover-50" onClick={handleClick}>
      <Stack direction="row" alignItems="center" gap={0.62}>
        <ProfileImage user={user} />
        <Stack direction="column">
          <Typography variant="fontDemiSm" color="text.secondary">
            {user?.name || ""}
          </Typography>
        </Stack>
      </Stack>
      <Stack>
        <ProfileArrowIcon />
      </Stack>
    </ProfileWrapper>
  );
}
const ProfileWrapper = styled(Link)(({ theme }) => ({
  display: "flex",
  gap: theme.spacing(0.75),
  alignItems: "center",
  justifyContent: "space-between",
  paddingInline: "0.56rem",
  paddingBlock: "0.56rem",
}));
