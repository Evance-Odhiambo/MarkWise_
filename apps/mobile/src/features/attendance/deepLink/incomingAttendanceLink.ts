import { Linking } from 'react-native';

/**
 * Catches "markwise://attend?session=<id>" — built by TakeOnlineAttendance.tsx's
 * share link and attempted by the web app's deep-link-handler.ts — on both cold
 * start (app not yet running) and warm start (app already open/backgrounded).
 * Returns an unsubscribe function.
 */
export function subscribeToIncomingAttendanceLinks(
  onSessionId: (sessionId: string) => void,
): () => void {
  const extractSessionId = (url: string | null | undefined): string | null => {
    if (!url) return null;
    try {
      // "markwise://attend?session=X" isn't a valid input for the WHATWG URL
      // parser's http(s)-oriented host/pathname rules on every RN/Hermes
      // version, so parse the query string directly rather than relying on
      // `new URL(url).searchParams`.
      const queryIndex = url.indexOf('?');
      if (queryIndex === -1) return null;
      const params = new URLSearchParams(url.slice(queryIndex + 1));
      return params.get('session');
    } catch {
      return null;
    }
  };

  const handleUrl = (url: string | null | undefined) => {
    const sessionId = extractSessionId(url);
    if (sessionId) onSessionId(sessionId);
  };

  Linking.getInitialURL()
    .then(handleUrl)
    .catch(() => undefined);

  const subscription = Linking.addEventListener('url', ({ url }) =>
    handleUrl(url),
  );

  return () => subscription.remove();
}
