import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Landing from './pages/Landing'
import Room from './pages/Room'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/room/:roomId" element={<Room />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  )
}

export default App
