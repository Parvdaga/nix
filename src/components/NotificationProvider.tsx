"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import Alert, { AlertColor } from "@mui/material/Alert";
import Box from "@mui/material/Box";

interface NotificationContextType {
  showNotification: (message: string, severity?: AlertColor) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertColor>("success");
  const [activeTimeout, setActiveTimeout] = useState<NodeJS.Timeout | null>(null);

  const showNotification = useCallback((msg: string, sev: AlertColor = "success") => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);

    setActiveTimeout((prevTimeout) => {
      if (prevTimeout) clearTimeout(prevTimeout);
      return setTimeout(() => {
        setOpen(false);
      }, 4000);
    });
  }, []);

  const handleClose = () => {
    setOpen(false);
    if (activeTimeout) {
      clearTimeout(activeTimeout);
      setActiveTimeout(null);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (activeTimeout) clearTimeout(activeTimeout);
    };
  }, [activeTimeout]);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {open && (
        <Box
          sx={{
            position: "absolute",
            bottom: { xs: 80, md: 24 }, // Fits nicely within mobile layout and simulator
            left: "50%",
            transform: "translateX(-50%)",
            width: "calc(100% - 32px)",
            maxWidth: 350,
            zIndex: 9999,
            animation: "fadeInUp 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards",
            "@keyframes fadeInUp": {
              "0%": {
                opacity: 0,
                transform: "translate(-50%, 16px)",
              },
              "100%": {
                opacity: 1,
                transform: "translate(-50%, 0)",
              },
            },
          }}
        >
          <Alert
            onClose={handleClose}
            severity={severity}
            variant="filled"
            sx={{ 
              width: "100%", 
              borderRadius: "12px",
              fontWeight: 600,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)",
            }}
          >
            {message}
          </Alert>
        </Box>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
