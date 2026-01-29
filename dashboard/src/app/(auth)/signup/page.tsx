import SignupCard from "@/features/auth/signup/SignupCard";
import { Stack } from "@mui/material";

export default function SignupPage() {
  return (
    <Stack width="100%" justifyContent="center" alignItems="center" paddingBottom={2}>
      <SignupCard />
    </Stack>
  );
}
