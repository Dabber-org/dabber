import { Box, styled, TextField, Typography } from "@mui/material";
import { FieldErrors, FieldValues, Path, UseFormRegister, UseFormWatch } from "react-hook-form";

interface LabeledTextareaProps<TFieldValues extends FieldValues = FieldValues> {
  label: string;
  name: Path<TFieldValues>;
  register: UseFormRegister<TFieldValues>;
  errors: FieldErrors<TFieldValues>;
  watch: UseFormWatch<TFieldValues>;
  placeholder: string;
  required?: boolean;
  rows?: number;
}

export default function LabeledTextarea<TFieldValues extends FieldValues = FieldValues>({
  label,
  name,
  register,
  errors,
  watch,
  placeholder,
  required = false,
  rows = 4,
}: LabeledTextareaProps<TFieldValues>) {
  return (
    <InputFieldWrapper>
      <Typography variant="fontMediumBase" color="text.primary">
        {label}
      </Typography>
      <StyledTextarea
        required={required}
        size="small"
        placeholder={placeholder}
        variant="outlined"
        multiline
        rows={rows}
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

const StyledTextarea = styled(TextField)(({ theme }) => ({
  width: "100%",
  "& .MuiOutlinedInput-root": {
    backgroundColor: theme.palette.background.surface,
    border: `1px solid ${theme.palette.border.default}`,
    borderRadius: "0.75rem",
    "& fieldset": {
      border: "transparent",
      borderRadius: "0.75rem",
    },
    "&:hover fieldset": {
      border: `1px solid ${theme.palette.border.primary}`,
    },
    "&.Mui-focused fieldset": {
      border: `1px solid ${theme.palette.border.primary}`,
    },
    "& textarea": {
      ...theme.typography.fontMediumSm,
      "&::placeholder": {
        color: theme.palette.text.muted,
        opacity: 1,
      },
      "&:-webkit-autofill, &:-webkit-autofill:hover, &:-webkit-autofill:focus, &:-webkit-autofill:active": {
        WebkitBoxShadow: `0 0 0 1000px ${theme.palette.background.surface} inset`,
        WebkitTextFillColor: theme.palette.text.primary,
        caretColor: theme.palette.text.primary,
        borderRadius: "0.75rem",
      },
    },
  },
}));

const InputFieldWrapper = styled(Box)(({}) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  justifyContent: "center",
  gap: "0.5rem",
  width: "100%",
}));
