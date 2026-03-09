import React, { useEffect } from "react";
import { useToast } from "./ToastProvider";

const NotificationCenter: React.FC = () => {
  const { showToast } = useToast();

  useEffect(() => {
    const eventSource = new EventSource("/api/v1/notifications/subscribe");

    eventSource.addEventListener("remittance_update", (event: any) => {
      try {
        const data = event.data;

        let message = data;
        let type: "INFO" | "SUCCESS" | "ERROR" = "INFO";

        if (data.includes("COMPLETED")) {
          message = "송금이 완료되었습니다.";
          type = "SUCCESS";
        } else if (data.includes("DISCREPANCY") || data.includes("FAILED")) {
          message = "송금 처리 중 오차가 발생했습니다.";
          type = "ERROR";
        }

        showToast(message, type);
      } catch (err) {
        console.error(err);
      }
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [showToast]);

  return null;
};

export default NotificationCenter;
