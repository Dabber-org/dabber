export default function LogsIcon({ primaryFill = "#A1A4A5" }: { primaryFill?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="14" viewBox="0 0 15 14">
      <path
        d="M0.75 6.75H3.75L6 12.75L9 0.75L11.25 6.75H14.25"
        stroke={primaryFill}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
