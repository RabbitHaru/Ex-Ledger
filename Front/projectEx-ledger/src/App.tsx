import React from "react";
import { BrowserRouter } from "react-router-dom";
import AppRoutes from "./config/AppRoutes";
import { ToastProvider } from "./components/notification/ToastProvider";
import { WalletProvider } from "./context/WalletContext";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
        <WalletProvider>
          <AppRoutes />
        </WalletProvider>
      </ToastProvider>
    </BrowserRouter>
  );
};

export default App;
