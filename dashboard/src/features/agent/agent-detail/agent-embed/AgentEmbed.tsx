import { Box, Modal, Slide, Stack, Typography, useTheme } from "@mui/material";
import { IconX } from "@tabler/icons-react";
import EmbeddingSolutionComponent from "./EmbeddingSolutionComponent";
import { Agent } from "@/generated/prisma";
import { buildEmbedInfo } from "@/features/agent/create-agent/core/embed";

export default function AgentEmbed({
  open,
  setOpen,
  agent,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  agent: Agent;
}) {
  const theme = useTheme();
  return (
    <Modal
      open={open}
      onClose={() => setOpen(false)}
      sx={{
        padding: "2rem",
      }}
      closeAfterTransition
      slotProps={{
        backdrop: {
          timeout: 300,
          sx: {
            backdropFilter: "blur(5px)",
            transition: "backdrop-filter 140ms ease-out, opacity 900ms ease-out !important",
          },
        },
      }}
    >
      <Slide direction="left" in={open} timeout={300}>
        <Box
          sx={{
            position: "absolute",
            right: "2rem",
            top: "15%",
            width: "30.625rem",
            height: "34.625rem",
            bgcolor: (theme) => theme.palette.background.default,
            border: `1px solid ${theme.palette.border.default}`,
            borderRadius: "1.825rem",
            p: "2rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            outline: "none",
            "&:focus": {
              outline: "none",
            },
          }}
        >
          <Stack>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="fontDemiXl" color="primary.main">
                Embed
              </Typography>
              <IconX
                size="1.125rem"
                color={theme.palette.text.secondary}
                onClick={() => setOpen(false)}
                cursor="pointer"
                className="opacityOnHover-50"
              />
            </Stack>
          </Stack>
          <EmbeddingSolutionComponent
            title="Add Agent to your website"
            userScript={buildEmbedInfo(agent).iframeEmbed}
            videoLink={encodeURI("/videos/1 Minute Sample Video.mp4")}
          />
        </Box>
      </Slide>
    </Modal>
  );
}
