import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
  active?: boolean;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  backPath?: string;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  backPath,
  status,
  actions,
  children,
}) => {
  return (
    <div className="mb-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between md:gap-6">
        {/* Main content: title, subtitle, breadcrumbs, back button */}
        <div className="flex-1 min-w-0">
          {/* Title and subtitle */}
          <div className="mb-2">
            <h1 className="text-2xl font-bold text-slate-50">{title}</h1>
            {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
          </div>
          
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <nav className="flex items-center space-x-1 text-sm text-slate-400">
              {breadcrumbs.map((breadcrumb, index) => (
                <React.Fragment key={breadcrumb.label}>
                  {!breadcrumb.active && breadcrumb.path ? (
                    <Link to={breadcrumb.path} className="hover:text-slate-200">
                      {breadcrumb.label}
                    </Link>
                  ) : (
                    <span className={breadcrumb.active ? 'font-medium text-slate-50' : 'text-slate-400'}>
                      {breadcrumb.label}
                    </span>
                  )}
                  {index < breadcrumbs.length - 1 && <span className="mx-1">/</span>}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>
        
        {/* Right side: back button, status, actions on md+ screens */}
        <div className="flex items-center space-x-4 md:ml-4">
          {/* Back button */}
          {backPath && (
            <Link to={backPath} className="flex items-center space-x-2 text-slate-400 hover:text-slate-200">
              <ChevronLeft size={16} />
              <span className="text-sm">Back</span>
            </Link>
          )}
          
          {/* Status indicator */}
          {status && (
            <div className="flex items-center space-x-2">
              {status}
            </div>
          )}
          
          {/* Actions */}
          {actions && (
            <div className="flex space-x-2">
              {actions}
            </div>
          )}
        </div>
      </div>
      
      {/* Full width children section (for tabs, etc.) on md+ screens */}
      {children && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default PageHeader;