import { type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

interface Props {
  children: ReactElement;
}

export default function ProtectedRoute({ children }: Props) {
  const auth = useAuth();
  
  if (!auth.isInitialized) {
    return null;
  }
  
  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
