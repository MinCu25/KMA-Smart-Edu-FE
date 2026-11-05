import { backendEnabled } from "../services/api/httpClient";
import { AcademicProvider } from "../context/AcademicContext";
import { ManagementProvider } from "../context/ManagementContext";
import type { ReactNode } from "react";
import { AuthProvider } from "../context/AuthContext";
import { UIProvider } from "../context/UIContext";
import { DemoDataProvider } from "../context/DemoDataContext";
import { ChatProvider } from "../context/ChatContext";
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <UIProvider>
        {backendEnabled ? (
          children
        ) : (
          <ManagementProvider>
            <AcademicProvider>
              <DemoDataProvider>
                <ChatProvider>{children}</ChatProvider>
              </DemoDataProvider>
            </AcademicProvider>
          </ManagementProvider>
        )}
      </UIProvider>
    </AuthProvider>
  );
}
