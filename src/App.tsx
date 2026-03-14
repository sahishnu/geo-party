import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import BoardView from './pages/BoardView'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  return (
    <>
      <Toaster position="bottom-right" richColors expand visibleToasts={5} />
      <Routes>
        <Route path="/" element={<BoardView />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </>
  )
}
