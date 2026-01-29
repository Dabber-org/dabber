import { Avatar } from "@mui/material";
import { User } from "@/types/session";
import { getAvatarStyles, getInitialsFromName } from "@/utils/stringAvatar";

export default function ProfileImage({ user }: { user: User | undefined }) {
  const name = user?.name || "";
  return <Avatar sx={getAvatarStyles(name)}>{getInitialsFromName(name)}</Avatar>;
}
