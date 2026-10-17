import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'list'; id: string }
  | { name: 'recurring'; listId?: string }
  | { name: 'settings' };

export function parseHash(hash: string): Route {
  const [path, qs] = hash.replace(/^#\/?/, '').split('?');
  const parts = path.split('/').filter(Boolean);
  const params = new URLSearchParams(qs);
  if (parts[0] === 'list' && parts[1]) return { name: 'list', id: parts[1] };
  if (parts[0] === 'recurring') return { name: 'recurring', listId: params.get('list') ?? undefined };
  if (parts[0] === 'settings') return { name: 'settings' };
  return { name: 'home' };
}

export function href(route: Route): string {
  switch (route.name) {
    case 'home': return '#/';
    case 'list': return `#/list/${route.id}`;
    case 'recurring': return route.listId ? `#/recurring?list=${route.listId}` : '#/recurring';
    case 'settings': return '#/settings';
  }
}

export function navigate(route: Route, replace = false) {
  if (replace) location.replace(href(route));
  else location.hash = href(route);
}

export function goBack() {
  if (history.length > 1 && location.hash && location.hash !== '#/') history.back();
  else navigate({ name: 'home' }, true);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
