import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function Card({ icon, title, description, className = "", children, ...props }: CardProps) {
  return (
    <div className={`ui-card ${className}`} {...props}>
      {icon && <div className="ui-card-icon">{icon}</div>}
      <h3 className="ui-card-title">{title}</h3>
      {description && (
        <div className="ui-card-description">
          {description}
        </div>
      )}
      {children}
    </div>
  );
}
