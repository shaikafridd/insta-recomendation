import React, { useEffect } from 'react';
import { useUser } from '../context/UserContext';

export const Toast = () => {
  const { toastMessage, setToastMessage } = useUser();

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 2600);
      return () => clearTimeout(timer);
    }
  }, [toastMessage, setToastMessage]);

  if (!toastMessage) return null;

  return (
    <div className="toast show">
      {toastMessage}
    </div>
  );
};
