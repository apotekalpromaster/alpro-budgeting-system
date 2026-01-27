import React from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'lg' }) => {
    if (!isOpen) return null;

    const modalRoot = document.getElementById('modal-root');
    
    if (!modalRoot) {
        console.error("The #modal-root element was not found in the DOM.");
        return null;
    }

    const sizeClasses = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        '3xl': 'max-w-3xl',
        '4xl': 'max-w-4xl',
    };


    return createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center animate-fade-in" onClick={onClose}>
            <div className={`bg-surface rounded-xl shadow-2xl w-full p-6 animate-scale-in ${sizeClasses[size]}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-border-color">
                    <h2 className="text-xl font-bold text-text-primary">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>,
        modalRoot
    );
};

export default Modal;
