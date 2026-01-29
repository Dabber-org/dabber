import { Stack } from "@mui/material";
import LoginCard from "@/features/auth/login/LoginCard";
export default function LoginPage() {
  return (
    <Stack width="100%" justifyContent="center" alignItems="center" paddingBottom={2}>
      <LoginCard />
    </Stack>
  );
}
