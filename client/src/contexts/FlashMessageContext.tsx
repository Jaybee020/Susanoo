import React, { createContext, useContext, useState, ReactNode } from "react";
import FlashMessage, { FlashMessageProps } from "../components/common/FlashMessage";

interface FlashMessageContextType {
  showMessage: (
    message: string,
    type: FlashMessageProps["type"],
    duration?: number
  ) => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
}

const FlashMessageContext = createContext<FlashMessageContextType | undefined>(
  undefined
);

interface FlashMessageProviderProps {
  children: ReactNode;
}

interface FlashMessageState extends FlashMessageProps {
  id: string;
}

export const FlashMessageProvider: React.FC<FlashMessageProviderProps> = ({
  children,
}) => {
  const [messages, setMessages] = useState<FlashMessageState[]>([]);

  const showMessage = (
    message: string,
    type: FlashMessageProps["type"],
    duration = 5000
  ) => {
    const id = Date.now().toString() + Math.random().toString(36);
    const newMessage: FlashMessageState = {
      id,
      message,
      type,
      duration,
    };

    setMessages((prev) => [...prev, newMessage]);
  };

  const removeMessage = (id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  const showSuccess = (message: string, duration?: number) => {
    showMessage(message, "success", duration);
  };

  const showError = (message: string, duration?: number) => {
    showMessage(message, "error", duration);
  };

  const showInfo = (message: string, duration?: number) => {
    showMessage(message, "info", duration);
  };

  const showWarning = (message: string, duration?: number) => {
    showMessage(message, "warning", duration);
  };

  const contextValue: FlashMessageContextType = {
    showMessage,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  };

  return (
    <FlashMessageContext.Provider value={contextValue}>
      {children}
      <div style={{ position: "fixed", top: 20, right: 20, zIndex: 1000 }}>
        {messages.map((msg, index) => (
          <div
            key={msg.id}
            style={{
              marginBottom: index < messages.length - 1 ? "12px" : "0",
            }}
          >
            <FlashMessage
              {...msg}
              onClose={() => removeMessage(msg.id)}
            />
          </div>
        ))}
      </div>
    </FlashMessageContext.Provider>
  );
};

export const useFlashMessage = (): FlashMessageContextType => {
  const context = useContext(FlashMessageContext);
  if (context === undefined) {
    throw new Error("useFlashMessage must be used within a FlashMessageProvider");
  }
  return context;
};