"use client";
import { Stack, Typography, Link as MuiLink } from "@mui/material";
import Paper from "../Paper";
import Link from "next/link";
import LabeledAuthInput, { LabeledAuthPasswordInput } from "@/components/LabeledAuthInput";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginFormSchema } from "../types";
import AuthButton, { GithubButton } from "../AuthButtons";
import Divider from "@/components/Divider";
import SignupLink from "./SignupLink";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { env } from "@/env";

export default function LoginCard() {
  const router = useRouter();
  const [isLoading, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<z.infer<typeof loginFormSchema>>({
    resolver: zodResolver(loginFormSchema),
  });
  const onSubmit = (data: z.infer<typeof loginFormSchema>) => {
    startTransition(async () => {
      await authClient.signIn.email(
        {
          email: data.email,
          password: data.password,
        },
        {
          onSuccess: () => {
            router.push("/agents");
          },
          onError: (ctx) => {
            console.error(ctx.error);
            setError("password", { message: ctx.error.message });
          },
        }
      );
    });
  };
  return (
    <Paper onSubmit={handleSubmit(onSubmit)}>
      <Stack gap={0.5} textAlign="center">
        <Typography variant="fontDemi5xl">Welcome back to Dabber!</Typography>
        <Typography variant="fontMediumBase" color="text.secondary">
          Log in to your account{" "}
        </Typography>
      </Stack>
      <Stack gap={1.25} width="100%">
        <LabeledAuthInput
          label="Email "
          name="email"
          register={register}
          errors={errors}
          watch={watch}
          placeholder="Enter your email address"
        />
        <LabeledAuthPasswordInput
          label="Password"
          name="password"
          register={register}
          errors={errors}
          watch={watch}
          placeholder="Enter your password"
        />
        <MuiLink
          sx={{
            textDecoration: "none",
            textAlign: "center",
          }}
          component={Link}
          href="/forgot-password"
          variant="fontRegularBase"
          color="border.primary"
          className="opacityOnHover-50"
        >
          Forgot your password?
        </MuiLink>
      </Stack>
      <Stack width="100%">
        <Stack gap={1} width="100%">
          <AuthButton label="Login" type="submit" isLoading={isLoading} />
          <SignupLink />
        </Stack>
        <Divider />
      </Stack>
      <Stack gap={1} width="100%">
        <GithubButton
          onClick={() => {
            authClient.signIn.social({ provider: "github", callbackURL: env.NEXT_PUBLIC_APP_URL });
          }}
        />
      </Stack>
    </Paper>
  );
}
