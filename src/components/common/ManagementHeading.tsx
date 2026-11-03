import type { ReactNode } from "react";
export function ManagementHeading({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="management-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="management-actions">{children}</div>
    </div>
  );
}
