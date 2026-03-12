import { Routes, Route } from 'react-router-dom'
import BoardView from './pages/BoardView'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<BoardView />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  )
}
