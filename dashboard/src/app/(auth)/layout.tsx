import React from "react";
import { Box, Stack } from "@mui/material";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/features/auth/Header";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/agents");
  }

  return (
    <Box
      component="main"
      padding={1.5}
      bgcolor="background.default"
      width="100%"
      height="100vh"
      sx={{
        position: "relative",
        overflow: "hidden",
        backgroundImage: "url('/auth-background.svg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Stack width="100%" height="100%" gap={1.25}>
        <Header />
        {children}
      </Stack>
      <Box
        component="img"
        src="/dabber-bot.svg"
        alt="Dabber bot"
        sx={{
          position: "absolute",
          bottom: -90,
          left: -100,
          transform: "rotate(8deg)", // adjust the angle as needed
          width: "500px", // adjust size as needed
          height: "auto",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
    </Box>
  );
}
