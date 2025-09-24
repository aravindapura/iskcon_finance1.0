import { forwardRef } from "react";
import type { ForwardRefExoticComponent, ReactNode, RefAttributes, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;
export type LucideIcon = ForwardRefExoticComponent<IconProps & RefAttributes<SVGSVGElement>>;

const createIcon = (children: ReactNode, displayName: string): LucideIcon => {
  const Icon = forwardRef<SVGSVGElement, IconProps>(
    ({ strokeWidth = 2, width = 24, height = 24, ...rest }, ref) => (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...rest}
      >
        {children}
      </svg>
    )
  );

  Icon.displayName = displayName;
  return Icon;
};

export const Sun = createIcon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" />
    <path d="M12 20v2" />
    <path d="M4.93 4.93 6.34 6.34" />
    <path d="M17.66 17.66 19.07 19.07" />
    <path d="M2 12h2" />
    <path d="M20 12h2" />
    <path d="M6.34 17.66 4.93 19.07" />
    <path d="M17.66 6.34 19.07 4.93" />
  </>,
  "Sun"
);

export const MoonStar = createIcon(
  <>
    <path d="M21 12.5A8.5 8.5 0 0 1 11.5 3a7 7 0 1 0 9.5 9.5Z" />
    <path d="M18.5 2.75 19.4 4.4l1.75.24-1.26 1.27.3 1.78-1.69-.9-1.69.9.3-1.78-1.26-1.27 1.75-.24Z" />
  </>,
  "MoonStar"
);

export const LayoutDashboard = createIcon(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="4" rx="1" />
    <rect x="14" y="9" width="7" height="12" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </>,
  "LayoutDashboard"
);

export const Wallet = createIcon(
  <>
    <path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
    <path d="M17 12h2" />
    <path d="M5 6V4a2 2 0 0 1 2-2h9" />
  </>,
  "Wallet"
);

export const HandCoins = createIcon(
  <>
    <circle cx="9" cy="6" r="3" />
    <path d="M21 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    <path d="M4 13.5s1.5-1.5 3.5-1.5h3.5a3 3 0 0 1 3 3v.5l3 .5c1.25.2 2 1.24 2 2.32V20h-7l-1.75 2H8a4 4 0 0 1-4-4Z" />
  </>,
  "HandCoins"
);

export const ListChecks = createIcon(
  <>
    <path d="M3 6h9" />
    <path d="M3 12h9" />
    <path d="M3 18h9" />
    <path d="m15 5.5 2 2 4-4" />
    <path d="m15 11.5 2 2 4-4" />
  </>,
  "ListChecks"
);

export const Target = createIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="2" />
  </>,
  "Target"
);

export const BarChart3 = createIcon(
  <>
    <path d="M3 3v18h18" />
    <rect x="7" y="10" width="3" height="7" rx="1" />
    <rect x="12" y="6" width="3" height="11" rx="1" />
    <rect x="17" y="13" width="3" height="4" rx="1" />
  </>,
  "BarChart3"
);

export const Settings = createIcon(
  <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
  </>,
  "Settings"
);

const icons = {
  Sun,
  MoonStar,
  LayoutDashboard,
  Wallet,
  HandCoins,
  ListChecks,
  Target,
  BarChart3,
  Settings
};

export default icons;
