import type { ReactNode } from "react";
export function Badge({
  tone = "green",
  children,
}: {
  tone?: "green" | "red" | "yellow" | "blue" | "gray";
  children: ReactNode;
}) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
