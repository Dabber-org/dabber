import { Paper as MuiPaper } from "@mui/material";
interface PaperProps {
  children: React.ReactNode;
  onSubmit?: () => void;
  isForm?: boolean;
}

export default function Paper({ children, onSubmit, isForm = true }: PaperProps) {
  return (
    <MuiPaper
      component={isForm ? "form" : "div"}
      onSubmit={isForm ? onSubmit : undefined}
      noValidate
      sx={{
        padding: 3,
        boxShadow: "none",
        minWidth: "24.125rem",
        maxWidth: "34.125rem",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        gap: "2.5rem",
        backgroundColor: "rgba(17,17,17,0.30)",
        border: "1px solid #4C4C4C",
        borderRadius: "2.1875rem",
        backdropFilter: "blur(45px)",
      }}
    >
      {children}
    </MuiPaper>
  );
}
