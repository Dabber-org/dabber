import { Box, styled, TextField, Typography } from "@mui/material";
import ShowPasswordButton from "./ShowPasswordButton";
import { useState } from "react";
import { FieldErrors, FieldValues, Path, UseFormRegister, UseFormWatch } from "react-hook-form";

interface LabeledInputProps<TFieldValues extends FieldValues = FieldValues> {
  label: string;
  name: Path<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
  watch: UseFormWatch<TFieldValues>;
  placeholder: string;
  defaultHelperText?: string;
}

export default function LabeledAuthInput<TFieldValues extends FieldValues = FieldValues>({
  label,
  name,
  register,
  errors,
  watch,
  placeholder,
}: LabeledInputProps<TFieldValues>) {
  return (
    <InputFieldWrapper>
      <Typography variant="fontMediumXl" color="text.primary">
        {label}
      </Typography>
      <InputField
        required
        size="small"
        placeholder={placeholder}
        variant="outlined"
        type={"text"}
        {...register(name)}
        error={!!errors[name]}
        helperText={errors[name]?.message as string}
        slotProps={{
          formHelperText: {
            sx: {
              color: watch(name) ? "primary.main" : "text.secondary",
              marginLeft: 0,
            },
          },
        }}
      />
    </InputFieldWrapper>
  );
}

export function LabeledAuthPasswordInput<TFieldValues extends FieldValues = FieldValues>({
  label,
  name,
  register,
  errors,
  watch,
  placeholder,
  defaultHelperText,
}: LabeledInputProps<TFieldValues>) {
  const [showPassword, setShowPassword] = useState(false);
  return (
    <InputFieldWrapper>
      <Typography variant="fontMediumXl" color="text.primary">
        {label}
      </Typography>
      <InputField
        required
        size="small"
        placeholder={placeholder}
        variant="outlined"
        type={showPassword ? "text" : "password"}
        {...register(name)}
        error={!!errors[name]}
        helperText={(errors[name]?.message as string) || defaultHelperText || ""}
        slotProps={{
          formHelperText: {
            sx: {
              color: watch(name) ? "primary.main" : "text.secondary",
              marginLeft: 0,
            },
          },
          input: {
            endAdornment: <ShowPasswordButton showPassword={showPassword} setShowPassword={setShowPassword} />,
          },
        }}
      />
    </InputFieldWrapper>
  );
}

export function LabeledNumberInput<TFieldValues extends FieldValues = FieldValues>({
  label,
  name,
  register,
  errors,
  watch,
  placeholder,
  defaultHelperText,
}: LabeledInputProps<TFieldValues>) {
  return (
    <InputFieldWrapper>
      <Typography variant="h2" color="text.primary">
        {label}
      </Typography>
      <NumberInputField
        required
        size="small"
        placeholder={placeholder}
        variant="outlined"
        type="number"
        {...register(name, { valueAsNumber: true })}
        error={!!errors[name]}
        helperText={(errors[name]?.message as string) || defaultHelperText || ""}
        slotProps={{
          formHelperText: {
            sx: {
              color: watch(name) ? "primary.main" : "text.secondary",
              marginLeft: 0,
            },
          },
        }}
      />
    </InputFieldWrapper>
  );
}

export const InputField = styled(TextField)(({ theme }) => ({
  width: "100%",
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.palette.background.surface,
    borderRadius: "0.5rem",

    "& fieldset": {
      border: "transparent",
      borderRadius: "0.5rem",
    },
    "&:hover fieldset": {
      border: `2px solid ${theme.palette.primary.main}`,
    },
    "&.Mui-focused fieldset": {
      border: `2px solid ${theme.palette.primary.main}`,
    },
    "& input": {
      "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active": {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.surface} inset`,
        WebkitTextFillColor: theme.palette.text.primary,
        caretColor: theme.palette.text.primary,
        borderRadius: "0.5rem",
      },
    },
  },
}));

export const NumberInputField = styled(TextField)(({ theme }) => ({
  width: "100%",
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.palette.background.surface,
    borderRadius: "0.5rem",

    "& fieldset": {
      border: "transparent",
      borderRadius: "0.5rem",
    },
    "&:hover fieldset": {
      border: `2px solid ${theme.palette.primary.main}`,
    },
    "&.Mui-focused fieldset": {
      border: `2px solid ${theme.palette.primary.main}`,
    },
    "& input": {
      "&::-webkit-outer-spin-button, &::-webkit-inner-spin-button": {
        WebkitAppearance: "none",
        margin: 0,
      },
      "&[type=number]": {
        MozAppearance: "textfield",
      },
      "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active": {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.surface} inset`,
        WebkitTextFillColor: theme.palette.text.primary,
        caretColor: theme.palette.text.primary,
        borderRadius: "0.5rem",
      },
    },
  },
}));

export const InputFieldWrapper = styled(Box)(({}) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "0.25rem",
  width: "100%",
}));
