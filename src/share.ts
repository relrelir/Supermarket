import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

/** Public web address of the app, used in invite links (also from inside the Android app). */
export function publicUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_URL;
  if (configured) return configured;
  if (Capacitor.isNativePlatform()) return '';
  return location.origin + location.pathname;
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
