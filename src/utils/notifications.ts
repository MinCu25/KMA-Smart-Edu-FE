export type NotificationTone = "success" | "error" | "info" | "warning";
export type Notification = {
  message: string;
  tone: NotificationTone;
  title?: string;
};
export const SUCCESS_NOTICE_MS = 2500;
export function notificationDuration(tone: NotificationTone): number | null {
  return tone === "success" || tone === "info" ? SUCCESS_NOTICE_MS : null;
}
// Utilities such as file export share the same feedback surface as React actions.
export function announce(message: string, tone: NotificationTone = "success") {
  window.dispatchEvent(
    new CustomEvent<Notification>("kma:notification", {
      detail: { message, tone },
    }),
  );
}
