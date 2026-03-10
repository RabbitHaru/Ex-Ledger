import React, { createContext, useContext, useState, useCallback } from "react";
import NotificationItem from "./NotificationItem";
import type { NotificationItemProps } from "./NotificationItem";

interface ToastContextType {
  showToast: (message: string, type: NotificationItemProps["type"]) => void;
  notificationHistory: {
    id: number;
    message: string;
    type: string;
    time: string;
  }[];
  removeNotification: (id: number) => void;
  clearAllNotifications: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<
    (NotificationItemProps & { id: number })[]
  >([]);
  const [notificationHistory, setNotificationHistory] = useState<any[]>([]);

  // 개별 알림 삭제 함수
  const removeNotification = useCallback((id: number) => {
    setNotificationHistory((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotificationHistory([]);
  }, []);

  const showToast = useCallback(
    (message: string, type: NotificationItemProps["type"]) => {
      const id = Date.now();
      const newNotification = {
        id,
        message,
        type,
        time: new Date().toLocaleTimeString(),
      };
      setToasts((prev) => [...prev, { id, message, type }]);
      setNotificationHistory((prev) => [newNotification, ...prev]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, 5000);
    },
    [],
  );

  return (
    <ToastContext.Provider
      value={{
        showToast,
        notificationHistory,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
      <div className="fixed bottom-8 right-8 z-[9999] flex flex-col-reverse gap-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="duration-300 pointer-events-auto animate-in slide-in-from-right-5"
          >
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
