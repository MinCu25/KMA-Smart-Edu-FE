import type { ReactNode } from "react";
export type Tone = "red" | "green" | "blue" | "yellow";
export type AlertMessage = { tone: Tone; text: string };
export type Dialog = {
  title: string;
  body?: string;
  confirm?: string;
  action?: () => void;
  content?: ReactNode;
};
