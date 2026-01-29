export default function ExpandArrow({ primaryFill = "#ACACAC", ...props }: { primaryFill?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="6" viewBox="0 0 10 6" fill="none" {...props}>
      <path
        d="M8.45833 0.875L4.66667 4.95833L0.875 0.875"
        stroke={primaryFill}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
