import type { ReactNode } from "react";
export function Notice({
  tone = "blue",
  children,
}: {
  tone?: "blue" | "yellow" | "red" | "green";
  children: ReactNode;
}) {
  return (
    <div
      className={`notice ${tone}`}
      role={tone === "red" ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
