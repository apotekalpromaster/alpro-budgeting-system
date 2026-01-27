import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '', title }) => {
    return (
        <div className={`bg-surface rounded-2xl shadow-md p-6 transition-shadow duration-300 hover:shadow-xl ${className}`}>
            {title && <h2 className="text-2xl font-bold text-text-primary mb-6 border-b border-border-color pb-4">{title}</h2>}
            {children}
        </div>
    );
};

export default Card;
