import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin, openAPI, apiKey } from "better-auth/plugins";
import { prisma } from "../core/db/prisma";
import { env } from "@/env";

export const auth = betterAuth({
  // hooks: {
  //   after: createAuthMiddleware(async (ctx) => {
  //     if (ctx.path.startsWith("/sign-up")) {
  //       const newSession = ctx.context.newSession;
  //       if (newSession) {
  //         await prisma.agent.create({
  //           data: {
  //             client: { connect: { id: newSession.user.id } },
  //             status: "active",
  //             name: newSession.user.name || "New Agent",
  //             languages: [],
  //             welcomeMessages: [],
  //             scrapingPages: [],
  //             scrapingPagesAmount: [],
  //             scrapingDepth: [],
  //             scrapingUrls: [],
  //           },
  //         });
  //       }
  //     }
  //   }),
  // },
  trustedOrigins: [env.BETTER_AUTH_URL],
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
  },
  user: {},
  plugins: [admin(), openAPI(), apiKey()],
});
