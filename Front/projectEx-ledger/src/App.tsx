import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./config/AppRoutes";
import { ToastProvider } from "./components/notification/ToastProvider";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
