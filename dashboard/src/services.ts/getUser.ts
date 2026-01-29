import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { User } from "@/types/session";

export const getUser = async () => {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    return session?.user as User;
  } catch (error) {
    console.error(error);
    return null;
  }
};
