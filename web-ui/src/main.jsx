import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import './styles/layout.css'
import App from './App.jsx'

const root = document.getElementById('root');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
// Fade in once React is mounted and fonts are ready
document.fonts.ready.then(() => {
  root.classList.add('app-ready');
});
