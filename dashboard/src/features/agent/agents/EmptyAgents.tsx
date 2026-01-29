import { Button, Typography } from "@mui/material";

import { Stack } from "@mui/material";
import { IconPlus } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
export default function EmptyAgents() {
  const router = useRouter();
  return (
    <Stack
      width="100%"
      sx={{
        border: (theme) => `0.15rem solid ${theme.palette.border.default}`,
        borderRadius: "0.75rem",
        padding: "1rem",
        minHeight: "50vh",
        justifyContent: "center",
      }}
      gap="1rem"
    >
      <Stack>
        <Typography variant="fontDemiXl" color="text.primary" textAlign="center">
          You don&apos;t have any agents yet
        </Typography>
        <Typography variant="fontRegularBase" color="text.secondary" textAlign="center">
          Create your first Agent to get started
        </Typography>
      </Stack>

      <Stack direction="row" justifyContent="center">
        <Button
          startIcon={<IconPlus />}
          sx={{
            backgroundColor: "text.primary",
            height: "fit-content",
            width: "fit-content",
            alignSelf: "center",
            paddingInline: "0.81rem",
          }}
          onClick={() => router.push("/agents/create")}
        >
          <Typography variant="fontDemiSm" color="primary.main" textTransform="none">
            Create Agent
          </Typography>
        </Button>
      </Stack>
    </Stack>
  );
}
