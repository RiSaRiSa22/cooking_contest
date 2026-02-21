import { createHashRouter, RouterProvider } from 'react-router'

const router = createHashRouter([
  {
    path: '/',
    element: <div>Home</div>,
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
