import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Landing } from './pages/Landing';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { Branches } from './pages/Branches';
import { Students } from './pages/Students';
import { Attendance } from './pages/Attendance';
import { Classes } from './pages/Classes';
import { Staff } from './pages/Staff';
import { Announcements } from './pages/Announcements';
import { ExcelImport } from './pages/ExcelImport';
import { ParentPortal } from './pages/ParentPortal';
import { Settings } from './pages/Settings';

export const router = createBrowserRouter([
  // Public routes
  {
    path: '/',
    element: <Landing />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },

  // Authenticated App Shell routes
  {
    element: <AppShell />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />,
      },
      {
        path: '/branches',
        element: <Branches />,
      },
      {
        path: '/students',
        element: <Students />,
      },
      {
        path: '/attendance',
        element: <Attendance />,
      },
      {
        path: '/classes',
        element: <Classes />,
      },
      {
        path: '/staff',
        element: <Staff />,
      },
      {
        path: '/announcements',
        element: <Announcements />,
      },
      {
        path: '/excel-import',
        element: <ExcelImport />,
      },
      {
        path: '/parent-portal',
        element: <ParentPortal />,
      },
      {
        path: '/settings',
        element: <Settings />,
      },
    ],
  },

  // Fallback
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
], {
  basename: import.meta.env.BASE_URL,
});
