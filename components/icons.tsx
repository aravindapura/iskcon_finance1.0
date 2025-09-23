import type { SVGProps } from "react";

export const SunIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 3v1.5m0 15V21m9-9h-1.5M4.5 12H3m16.364 7.364-1.06-1.06M6.696 6.696 5.636 5.636m12.728 0-1.06 1.06M6.696 17.304l-1.06 1.06M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
    />
  </svg>
);

export const MoonIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12.79A9 9 0 0 1 11.21 3 7.5 7.5 0 1 0 21 12.79Z"
    />
  </svg>
);

export const LotusIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 4.5L14.4 10 12 13.8 9.6 10Z" />
    <path d="M7 6.5 9.5 11.2 6.5 14.5 5 10Z" />
    <path d="M17 6.5 14.5 11.2 17.5 14.5 19 10Z" />
    <path d="M4 12s3 5.5 8 5.5 8-5.5 8-5.5" />
    <path d="M7.5 14.5S10 18 12 18s4.5-3.5 4.5-3.5" />
  </svg>
);
