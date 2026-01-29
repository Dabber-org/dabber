import { Stack, Typography, CircularProgress } from "@mui/material";

export default function AgentDetailLoading() {
  return (
    <Stack alignItems="center" justifyContent="center" minHeight="50vh">
      <CircularProgress />
      <Typography variant="fontMediumBase" color="text.secondary" sx={{ mt: 2 }}>
        Loading agent...
      </Typography>
    </Stack>
  );
}
