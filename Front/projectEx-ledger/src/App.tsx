import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./config/AppRoutes";
import { ToastProvider } from "./components/notification/ToastProvider";
import NotificationCenter from "./components/notification/NotificationCenter";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <NotificationCenter />
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
