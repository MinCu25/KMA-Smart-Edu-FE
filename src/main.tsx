import { createRoot } from "react-dom/client";
import App from "./app/App";
import { AppProviders } from "./app/AppProviders";
import "./styles/index.css";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <App />
  </AppProviders>,
);
