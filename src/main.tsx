import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { App } from './App';
import { receiveLink } from './joinLink';
import './styles.css';

if (Capacitor.isNativePlatform()) {
  // Android back button: go back within the app, exit from the home screen.
  CapApp.addListener('backButton', () => {
    if (location.hash && location.hash !== '#/') history.back();
    else CapApp.exitApp();
  });
  // Invite links open the app (Android App Links): on a cold start and while it is running.
  CapApp.getLaunchUrl().then((launch) => launch?.url && receiveLink(launch.url));
  CapApp.addListener('appUrlOpen', ({ url }) => receiveLink(url));
} else {
  import('virtual:pwa-register').then(({ registerSW }) => registerSW({ immediate: true }));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
