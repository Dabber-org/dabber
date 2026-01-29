import React from "react";
import { Stack } from "@mui/material";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/sidebar/Sidebar";
import { User } from "@/types/session";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) redirect("/login");

  const user = session.user as User;

  return (
    <Stack component="main" direction="row" width="100%" height="100vh" bgcolor="background.default">
      <Sidebar user={user} />
      <Stack flex={1} direction="column" overflow="hidden">
        <Stack
          direction="row"
          justifyContent="space-between"
          width="100%"
          paddingInline={1.5}
          paddingBlock={1.5}
          sx={{
            borderBottom: "1px solid #262626",
          }}
        >
          <Header />
        </Stack>
        <Stack flex={1} overflow="auto" p={3}>
          {children}
        </Stack>
      </Stack>
    </Stack>
  );
}
