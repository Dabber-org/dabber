"use client";

import { Box, IconButton } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";

type EmbedCodeBoxProps = {
  userScript: string;
};

export default function EmbedCodeBox({ userScript }: EmbedCodeBoxProps) {
  const codeString = `${userScript}`;

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(codeString);
  };

  return (
    <Box
      sx={{
        position: "relative",
        borderRadius: 2,
        border: "1px solid rgba(255,255,255,0.1)",
        overflow: "hidden",
        bgcolor: "#0f0f0f",
      }}
    >
      {/* Copy Button */}

      {/* Syntax Highlighter */}
      <SyntaxHighlighter
        language="html"
        style={dracula}
        customStyle={{
          margin: 0,
          padding: "16px",
          background: "transparent",
          fontSize: "16px",
        }}
        wrapLongLines
      >
        {codeString}
      </SyntaxHighlighter>
      <IconButton
        onClick={copyToClipboard}
        size="small"
        sx={{ position: "absolute", bottom: 12, right: 12, color: "#4dd0e1", zIndex: 2 }}
      >
        <ContentCopyIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
