import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from '@/App'
import { applyTheme } from '@/lib/theme'
import '@/index.css'

// Aplica la identidad visual por defecto antes del primer render.
// Cuando llega la configuración de la empresa desde Supabase, se vuelve a
// aplicar con los colores guardados (ver BusinessProvider).
applyTheme()

const container = document.getElementById('root')
if (!container) {
  throw new Error('No se encontró el elemento #root en el documento.')
}

ReactDOM.createRoot(container).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
