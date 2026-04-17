import React from 'react';
import { Navigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  return <Navigate to="/start" replace />;
};

export default DashboardPage;
