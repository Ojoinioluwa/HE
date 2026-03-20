// src/main.tsx (Updated)

import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux"; // Import Redux Provider
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App.tsx";
import { store } from "./redux/store.ts"; // Import your Redux store
import "./index.css";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer } from "react-toastify";
import { Buffer } from "buffer"; // <-- Keep Buffer Polyfill if needed
(window as any).Buffer = Buffer; // <-- Keep Buffer Polyfill if needed

const queryClient = new QueryClient();

// src/main.tsx
// ... (imports)

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
          /* Use 'className' to set the outer width */
          className="w-[600px]! max-w-[90vw]!"
          /* Use 'toastClassName' to style the individual cards */
          toastClassName="relative flex p-6 min-h-[100px] rounded-xl justify-between overflow-hidden cursor-pointer shadow-2xl mb-4 text-xl font-bold"
          /* Note: If you need to style the inner text container specifically, 
             the prop name is actually 'bodyClassName' (it IS valid, but TS 
             sometimes struggles if the version is older/mismatched). 
             If it still complains, just put all text styles in 'toastClassName'. */
        />
        <App />
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>,
);
