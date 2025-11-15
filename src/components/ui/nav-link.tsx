import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  to: string;
  activeClassName?: string;
  end?: boolean;
  children: React.ReactNode;
}

export const NavLink = ({ 
  to, 
  activeClassName = 'bg-muted text-primary font-medium', 
  end = false, 
  className, 
  children, 
  ...props 
}: NavLinkProps) => {
  const location = useLocation();
  const isActive = end ? location.pathname === to : location.pathname.startsWith(to);
  
  return (
    <Link 
      to={to} 
      className={cn(className, isActive && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
};
