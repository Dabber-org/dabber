import { Stack, Typography } from "@mui/material";
import EmbedCodeBox from "./EmbedCodeBox";

export default function EmbeddingSolutionComponent({
  title,
  userScript,
  videoLink,
}: {
  title: string;
  userScript: string;
  videoLink: string;
}) {
  return (
    <Stack gap="2.5rem">
      <Stack gap="0.62rem">
        <Stack direction="row" alignItems="center" gap="0.5rem">
          <Typography variant="fontDemi3_5xs" color="text.primary">
            {title}
          </Typography>
        </Stack>
        <EmbedCodeBox userScript={userScript} />
      </Stack>

      <Stack gap="0.62rem">
        <Typography variant="fontDemi3_5xs" color="text.primary">
          How to use it?
        </Typography>

        <video
          src={videoLink}
          controls
          preload="metadata"
          controlsList="nodownload nofullscreen noplaybackrate noairplay"
          style={{ borderRadius: 20, overflow: "hidden", width: "27.125rem", height: "14.12rem", objectFit: "cover" }}
        />
      </Stack>
    </Stack>
  );
}
