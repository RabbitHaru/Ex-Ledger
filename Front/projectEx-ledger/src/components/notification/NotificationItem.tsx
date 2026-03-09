import React from "react";

export interface NotificationItemProps {
  message: string;
  type: "SUCCESS" | "ERROR" | "INFO";
  timestamp?: string;
  onClose?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  message,
  type,
  timestamp,
  onClose,
}) => {
  const styles = {
    SUCCESS: "bg-green-50 border-green-200 text-green-800",
    ERROR: "bg-red-50 border-red-200 text-red-800",
    INFO: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const icons = { SUCCESS: "✅", ERROR: "🚨", INFO: "📢" };

  return (
    <div
      className={`p-4 rounded-2xl shadow-lg border-2 flex items-center gap-4 animate-fade-in-down ${styles[type]}`}
    >
      <div className="text-2xl">{icons[type]}</div>
      <div className="flex-1">
        <p className="text-sm font-bold leading-tight">{message}</p>
        {timestamp && (
          <p className="text-[10px] opacity-60 mt-1">{timestamp}</p>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default NotificationItem;
