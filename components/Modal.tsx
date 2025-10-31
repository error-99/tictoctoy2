
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 transition-opacity duration-300">
      <div className="bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full relative transform transition-all duration-300 scale-100">
        {children}
      </div>
    </div>
  );
};

export default Modal;
