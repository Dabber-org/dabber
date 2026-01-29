"use client";
import { Stack, Typography } from "@mui/material";
import Paper from "../Paper";
import LabeledAuthInput, { LabeledAuthPasswordInput } from "@/components/LabeledAuthInput";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { SignupSchema } from "../types";
import AuthButton, { GithubButton } from "../AuthButtons";
import Divider from "@/components/Divider";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import LoginLink from "./LoginLink";

export default function SignupCard() {
  const router = useRouter();
  const [isLoading, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<z.infer<typeof SignupSchema>>({
    resolver: zodResolver(SignupSchema),
  });
  const onSubmit = (data: z.infer<typeof SignupSchema>) => {
    startTransition(async () => {
      await authClient.signUp.email(
        {
          email: data.email,
          name: data.name,
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
        <Typography variant="fontDemi5xl">Welcome to Dabber!</Typography>
        <Typography variant="fontMediumBase" color="text.secondary">
          Create an account to get started{" "}
        </Typography>
      </Stack>
      <Stack gap={1.25} width="100%">
        <LabeledAuthInput
          label="Name"
          name="name"
          register={register}
          errors={errors}
          watch={watch}
          placeholder="Enter your name"
        />
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
      </Stack>
      <Stack width="100%">
        <Stack gap={1} width="100%">
          <AuthButton label="Sign up" type="submit" isLoading={isLoading} />
          <LoginLink />
        </Stack>
        <Divider />
      </Stack>
      <Stack gap={1} width="100%">
        <GithubButton onClick={() => {}} />
      </Stack>
    </Paper>
  );
}
