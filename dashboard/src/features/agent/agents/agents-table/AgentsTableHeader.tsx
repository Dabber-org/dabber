import { TableCell, TableRow, Typography } from "@mui/material";

import { TableHead } from "@mui/material";

export default function AgentsTableHeader() {
  return (
    <TableHead
      sx={{
        backgroundColor: "background.surface",
        paddingBlock: "0.5rem",
        border: (theme) => `1px solid ${theme.palette.border.default}`,
        borderRadius: "0.75rem",
      }}
    >
      <TableRow>
        {titles.map((title) => (
          <TableCell key={title} sx={{ paddingBlock: "0.5rem" }}>
            <Typography variant="fontDemiSm" color="primary.main">
              {title}
            </Typography>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

const titles = ["Name", "Type", "Status", "Created", "Actions"];
