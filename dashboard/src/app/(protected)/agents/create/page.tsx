import { CreateAgentProvider } from "@/features/agent/create-agent/context";
import Header from "@/features/agent/create-agent/Header";
import StepsContainer from "@/features/agent/create-agent/StepsContainer";
import { Stack } from "@mui/material";

export default function CreateAgentPage() {
  return (
    <CreateAgentProvider>
      <Stack width="40rem" justifyContent="center" alignItems="center" margin="0 auto">
        <Header />
        <StepsContainer />
      </Stack>
    </CreateAgentProvider>
  );
}
