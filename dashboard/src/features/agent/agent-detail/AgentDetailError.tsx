import { Stack, Typography } from "@mui/material";

type AgentDetailErrorProps = {
  error: string;
};

export default function AgentDetailError({ error }: AgentDetailErrorProps) {
  return (
    <Stack alignItems="center" justifyContent="center" minHeight="50vh">
      <Typography variant="fontMediumBase" color="error">
        {error}
      </Typography>
    </Stack>
  );
}
