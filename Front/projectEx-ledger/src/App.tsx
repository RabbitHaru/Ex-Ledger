import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./config/AppRoutes";
import { ToastProvider } from "./components/notification/ToastProvider";
import NotificationCenter from "./components/notification/NotificationCenter";
import { Toaster } from "sonner";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <ToastProvider>
        <NotificationCenter />
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
