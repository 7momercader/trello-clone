import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WorkspacesProvider } from './context/WorkspacesContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <WorkspacesProvider>
          <App />
        </WorkspacesProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)