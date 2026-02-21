import { createHashRouter, RouterProvider } from 'react-router'
import { HomeScreen } from './screens/Home/HomeScreen'

const router = createHashRouter([
  {
    path: '/',
    element: <HomeScreen />,
  },
  {
    path: '/admin/:code',
    element: <div>Admin</div>,
  },
  {
    path: '/voter/:code',
    element: <div>Voter</div>,
  },
])

export function AppRouter() {
  return <RouterProvider router={router} />
}
