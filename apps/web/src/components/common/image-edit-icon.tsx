import type { SVGProps } from "react";

export function ImageEditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 20H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" />
      <circle cx="9" cy="9" r="2" />
      <path d="m3 16 4-4 3 3 4-4" />
      <path d="M17 22l-2.5-2.5L20 14l2.5 2.5z" />
      <path d="m22 16.5-2.5-2.5" />
    </svg>
  );
}
