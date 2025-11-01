import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
import UnauthorizedPage from '../auth/UnauthorizedPage';
import ClassManagement from './ClassManagement';

const ClassManagementWrapper: React.FC = () => {
  const { user } = useAuth();

  // Check if user has permission to access class management
  const hasPermission = user && (
    user.role === UserRole.ADMIN || 
    user.role === UserRole.FACULTY
  );

  if (!hasPermission) {
    return (
      <UnauthorizedPage 
        message="You don't have permission to access class management. This feature is only available to administrators and faculty members."
      />
    );
  }

  return <ClassManagement />;
};

export default ClassManagementWrapper;