import { readStorage } from "./storage";
import type { Contact } from "../../types/profile";
const DEFAULT_CONTACT: Contact = {
  email: "an.ct080101@example.com",
  phone: "0900000000",
};
export function readContact(): Contact {
  return readStorage("kma-reference-contact", DEFAULT_CONTACT);
}
export function saveContact(contact: Contact): void {
  localStorage.setItem("kma-reference-contact", JSON.stringify(contact));
}
