import type {
  CitationResponse,
  GraduationScenarioResponse,
  AiIntent,
} from "./dto";
export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  messageId?: string;
  intent?: AiIntent;
  citations?: CitationResponse[];
  scenario?: GraduationScenarioResponse | null;
};
