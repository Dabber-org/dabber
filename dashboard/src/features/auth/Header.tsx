import { MainLogo } from "@/icons/brand/MainLogo";
import { Stack } from "@mui/material";

export default function Header() {
  return (
    <Stack direction="row" justifyContent="flex-end" width="100%">
      <MainLogo />
    </Stack>
  );
}
