import React from 'react';

// Define the props for the Alert component
interface AlertProps {
  children: React.ReactNode;
  className?: string; // Optional className prop for custom styling
}

export const Alert: React.FC<AlertProps> = ({ children, className = '' }) => {
  return (
    <div className={`alert ${className}`}>
      {children}
    </div>
  );
};

// Define the props for the AlertTitle component
interface AlertTitleProps {
  children: React.ReactNode;
}

export const AlertTitle: React.FC<AlertTitleProps> = ({ children }) => {
  return (
    <h4 className="alert-title font-bold text-lg">
      {children}
    </h4>
  );
};

// Define the props for the AlertDescription component
interface AlertDescriptionProps {
  children: React.ReactNode;
}

export const AlertDescription: React.FC<AlertDescriptionProps> = ({ children }) => {
  return (
    <p className="alert-description text-sm">
      {children}
    </p>
  );
};
