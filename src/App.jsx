import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage   from './pages/LoginPage'
import SuccessPage from './pages/SuccessPage'

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/"        element={<LoginPage />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="*"        element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
