function stringToColor(string: string): string {
  let hash = 0;
  for (let i = 0; i < string.length; i += 1) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }

  let color = "#";
  for (let i = 0; i < 3; i += 1) {
    const value = (hash >> (i * 8)) & 0xff;
    color += `00${value.toString(16)}`.slice(-2);
  }
  return color;
}

function getInitials(name: string): string {
  if (!name) return "G";

  const parts = name.trim().split(" ");
  const firstLetter = parts[0]?.[0]?.toUpperCase() || "";

  if (firstLetter) return firstLetter;
  return "G";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getAvatarStyles(name: string) {
  const color = stringToColor(name || "Guest");

  return {
    bgcolor: hexToRgba(color, 0.15),
    color: color,
    fontWeight: 600,
    fontSize: "1rem",
    width: "2rem",
    height: "2rem",
    borderRadius: "0.5rem",
  };
}

export function getInitialsFromName(name: string): string {
  return getInitials(name);
}
