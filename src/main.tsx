import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { siteConfig } from './config/site';
import './styles/globals.css';

// Set language/direction/title/theme before the first paint of the real app
// so there's no flash of the wrong direction, a stale title, or - critically
// for the splash screen - a flash of the light theme for someone whose saved
// or system preference is dark (master spec, "Loading / Splash Screen":
// "must inherit the active theme instead of always opening light").
const savedLanguage = window.localStorage.getItem('app-language') ?? siteConfig.defaultLanguage;
document.documentElement.lang = savedLanguage;
document.documentElement.dir = savedLanguage === 'ar' ? 'rtl' : 'ltr';
document.title = siteConfig.name;

const savedTheme = window.localStorage.getItem('app-theme') ?? siteConfig.defaultTheme;
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const resolvedDark = savedTheme === 'dark' || (savedTheme === 'system' && prefersDark);
document.documentElement.classList.toggle('dark', resolvedDark);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
