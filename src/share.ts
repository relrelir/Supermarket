import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import projectConfig from './firebase-config.json';

/**
 * Address used in invite links. The web app is served by Firebase Hosting on this domain,
 * which also hosts /.well-known/assetlinks.json so the links open the Android app when installed.
 */
export function publicUrl(): string {
  return import.meta.env.VITE_PUBLIC_URL || `https://${projectConfig.projectId}.web.app/`;
}

export function inviteText(familyName: string, code: string): string {
  const url = publicUrl();
  return [
    `הצטרפו לרשימת הקניות "${familyName}" 🛒`,
    `קוד משפחה: ${code}`,
    url ? `${url}?join=${code}` : '',
  ].filter(Boolean).join('\n');
}

export async function shareText(text: string): Promise<'shared' | 'copied'> {
  if (Capacitor.isNativePlatform()) {
    await Share.share({ text });
    return 'shared';
  }
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch {
      // User cancelled or share unavailable; fall back to copying.
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}
