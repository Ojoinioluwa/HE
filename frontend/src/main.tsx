// src/main.tsx (Updated)

import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux"; // Import Redux Provider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { store } from "./redux/store.ts"; // Import your Redux store
import "./index.css";
import { Buffer } from "buffer"; // <-- Keep Buffer Polyfill if needed
(window as any).Buffer = Buffer; // <-- Keep Buffer Polyfill if needed

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      {" "}
      {/* 1. Redux Provider */}
      <QueryClientProvider client={queryClient}>
        {" "}
        {/* 2. TanStack Query Provider */}
        <App />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
