import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { App } from './App';
import './styles.css';

if (Capacitor.isNativePlatform()) {
  // Android back button: go back within the app, exit from the home screen.
  CapApp.addListener('backButton', () => {
    if (location.hash && location.hash !== '#/') history.back();
    else CapApp.exitApp();
  });
} else {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
