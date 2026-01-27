import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, className = '', ...props }) => {
    const baseClasses = "px-4 py-2 rounded-lg font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 transform hover:scale-105 active:scale-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100";

    const variantClasses = {
        primary: 'bg-primary text-white hover:bg-primary-dark hover:shadow-lg focus:ring-primary-dark',
        secondary: 'bg-secondary text-white hover:bg-emerald-600 focus:ring-secondary',
        danger: 'bg-danger text-white hover:bg-red-600 focus:ring-danger',
        ghost: 'bg-transparent text-text-secondary hover:bg-gray-100 focus:ring-primary',
    };

    const finalClassName = `${baseClasses} ${variantClasses[variant]} ${className}`;

    return (
        <button className={finalClassName} {...props}>
            {children}
        </button>
    );
};

export default Button;
