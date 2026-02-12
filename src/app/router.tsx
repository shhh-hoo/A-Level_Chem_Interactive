import { createBrowserRouter, Navigate } from 'react-router-dom';
import { App } from './App';
import { RoleGuard } from './RoleGuard';
import { RouteError } from './RouteError';
import { Map } from '../pages/Map';
import { Student } from '../pages/Student';
import { Teacher } from '../pages/Teacher';

export const router: ReturnType<typeof createBrowserRouter> = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Navigate to="/student" replace /> },
      { path: 'student', element: <Student /> },
      { path: 'map', element: <Map /> },
      {
        path: 'teacher',
        element: (
          <RoleGuard blockedRoles={['student']} redirectTo="/student">
            <Teacher />
          </RoleGuard>
        ),
      },
      { path: '*', element: <Navigate to="/student" replace /> },
    ],
  },
], {
  basename: import.meta.env.BASE_URL,
});
