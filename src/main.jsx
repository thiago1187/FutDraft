import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary onReset={() => { try { location.hash = ""; } catch (_) {} }}>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
