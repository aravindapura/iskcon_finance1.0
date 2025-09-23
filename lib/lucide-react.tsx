import type { SVGProps } from "react";

export type LucideIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

export const Sun: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx={12} cy={12} r={4} />
    <line x1={12} y1={2} x2={12} y2={4} />
    <line x1={12} y1={20} x2={12} y2={22} />
    <line x1={4.22} y1={4.22} x2={5.64} y2={5.64} />
    <line x1={18.36} y1={18.36} x2={19.78} y2={19.78} />
    <line x1={2} y1={12} x2={4} y2={12} />
    <line x1={20} y1={12} x2={22} y2={12} />
    <line x1={4.22} y1={19.78} x2={5.64} y2={18.36} />
    <line x1={18.36} y1={5.64} x2={19.78} y2={4.22} />
  </svg>
);

export const Moon: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M21 12.79A9 9 0 0 1 11.21 3a7 7 0 1 0 9.79 9.79Z" />
  </svg>
);

export const Home: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10.5v9.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9.5" />
  </svg>
);

export const Wallet: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <rect x={3} y={5} width={18} height={14} rx={2} ry={2} />
    <path d="M16 9h5v6h-5a3 3 0 0 1 0-6Z" />
    <circle cx={18.5} cy={12} r={1} />
  </svg>
);

export const CircleDollarSign: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx={12} cy={12} r={9} />
    <line x1={12} y1={7} x2={12} y2={17} />
    <path d="M9 9.5C9 8.4 10.2 7.5 12 7.5s3 0.9 3 2S13.8 11 12 11s-3 0.9-3 2.5S10.2 16 12 16s3-0.9 3-2.5" />
  </svg>
);

export const CalendarCheck: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <rect x={3} y={4} width={18} height={18} rx={2} ry={2} />
    <line x1={16} y1={2} x2={16} y2={6} />
    <line x1={8} y1={2} x2={8} y2={6} />
    <line x1={3} y1={10} x2={21} y2={10} />
    <path d="m9 16 2 2 4-4" />
  </svg>
);

export const BarChart3: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <line x1={4} y1={21} x2={20} y2={21} />
    <rect x={6} y={11} width={4} height={8} rx={1} />
    <rect x={11} y={7} width={4} height={12} rx={1} />
    <rect x={16} y={4} width={4} height={15} rx={1} />
  </svg>
);

export const Settings: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx={12} cy={12} r={3} />
    <path d="M19.4 15a1.78 1.78 0 0 0 .33 2l0 0a1.9 1.9 0 1 1-2.68 2.68l0 0a1.79 1.79 0 0 0-2-.33 1.79 1.79 0 0 0-1 1.58V22a2 2 0 0 1-4 0v-.07a1.79 1.79 0 0 0-1-1.58 1.78 1.78 0 0 0-2 .33l0 0a1.9 1.9 0 1 1-2.68-2.68l0 0a1.78 1.78 0 0 0 .33-2 1.78 1.78 0 0 0-1.58-1H2a2 2 0 0 1 0-4h.07a1.78 1.78 0 0 0 1.58-1 1.78 1.78 0 0 0-.33-2l0 0a1.9 1.9 0 0 1 2.68-2.68l0 0a1.78 1.78 0 0 0 2-.33A1.79 1.79 0 0 0 9 2.07V2a2 2 0 0 1 4 0v.07a1.79 1.79 0 0 0 1 1.58 1.79 1.79 0 0 0 2-.33l0 0a1.9 1.9 0 0 1 2.68 2.68l0 0a1.78 1.78 0 0 0-.33 2 1.78 1.78 0 0 0 1.58 1H22a2 2 0 0 1 0 4h-.07a1.78 1.78 0 0 0-1.58 1Z" />
  </svg>
);

export const PiggyBank: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <path d="M5 11a7 7 0 0 1 7-7 7 7 0 0 1 6.6 4.6H21v4h-1.4a7 7 0 0 1-6.6 4.4 7 7 0 0 1-2.4-.4L9 19H6l1.2-2.8A6.9 6.9 0 0 1 5 11Z" />
    <circle cx={15.5} cy={9.5} r={0.8} />
  </svg>
);

export const TrendingUp: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  </svg>
);

export const ArrowUpCircle: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx={12} cy={12} r={9} />
    <polyline points="8.5 13.5 12 10 15.5 13.5" />
    <line x1={12} y1={16} x2={12} y2={10} />
  </svg>
);

export const ArrowDownCircle: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx={12} cy={12} r={9} />
    <polyline points="8.5 10.5 12 14 15.5 10.5" />
    <line x1={12} y1={8} x2={12} y2={14} />
  </svg>
);

export const Target: LucideIcon = (props) => (
  <svg {...iconProps} {...props}>
    <circle cx={12} cy={12} r={9} />
    <circle cx={12} cy={12} r={5} />
    <circle cx={12} cy={12} r={2} />
  </svg>
);

const lucide = {
  Sun,
  Moon,
  Home,
  Wallet,
  CircleDollarSign,
  CalendarCheck,
  BarChart3,
  Settings,
  PiggyBank,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Target
};

export default lucide;
