import { createContext, useCallback, useContext, useState } from "react";
import "./AlertModal.css";

const AlertContext = createContext(null);

export function AlertProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const closeDialog = useCallback((result) => {
    setDialog((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const showAlert = useCallback((message, title = "Notice") => {
    return new Promise((resolve) => {
      setDialog({ title, message, isConfirm: false, resolve });
    });
  }, []);

  const showConfirm = useCallback((message, title = "Please confirm") => {
    return new Promise((resolve) => {
      setDialog({ title, message, isConfirm: true, resolve });
    });
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      {dialog && (
        <div className="alert-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDialog(false);
        }}>
          <section className="alert-modal" role="alertdialog" aria-modal="true" aria-labelledby="alert-modal-title" aria-describedby="alert-modal-message">
            <div className="alert-modal-header">
              <span className="alert-modal-mark" aria-hidden="true">!</span>
              <h2 id="alert-modal-title">{dialog.title}</h2>
              <button type="button" className="alert-modal-close" onClick={() => closeDialog(false)} aria-label="Close alert">&times;</button>
            </div>
            <p id="alert-modal-message">{dialog.message}</p>
            <div className="alert-modal-actions">
              {dialog.isConfirm && (
                <button type="button" className="alert-modal-button alert-modal-button-secondary" onClick={() => closeDialog(false)}>No</button>
              )}
              <button type="button" className="alert-modal-button alert-modal-button-primary" autoFocus onClick={() => closeDialog(true)}>
                {dialog.isConfirm ? "Yes" : "OK"}
              </button>
            </div>
          </section>
        </div>
      )}
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) throw new Error("useAlert must be used inside AlertProvider");
  return context;
}
