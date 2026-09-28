import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { siteConfig } from './config/site';
import './styles/globals.css';

// Set language/direction/title before the first paint of the real app so
// there's no flash of the wrong direction or a stale "SITE_NAME" tab title.
const savedLanguage = window.localStorage.getItem('app-language') ?? siteConfig.defaultLanguage;
document.documentElement.lang = savedLanguage;
document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
document.title = siteConfig.name;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
