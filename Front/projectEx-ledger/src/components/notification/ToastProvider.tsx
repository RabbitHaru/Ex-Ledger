import React, { createContext, useContext, useState, useCallback } from "react";
import NotificationItem from "./NotificationItem";
import type { NotificationItemProps } from "./NotificationItem";

interface ToastContextType {
  showToast: (message: string, type: NotificationItemProps["type"]) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<
    (NotificationItemProps & { id: number })[]
  >([]);

  const showToast = useCallback(
    (message: string, type: NotificationItemProps["type"]) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);

      // 5초 후 자동 삭제
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* 화면 우측 상단에 토스트 레이어 배치 */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <NotificationItem
              {...toast}
              onClose={() =>
                setToasts((prev) => prev.filter((t) => t.id !== toast.id))
              }
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};
