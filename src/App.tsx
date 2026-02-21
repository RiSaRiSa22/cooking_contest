import { AppRouter } from './router'
import { ToastProvider } from './components/ui/Toast'

function App() {
  return (
    <>
      <AppRouter />
      <ToastProvider />
    </>
  )
}

export default App
