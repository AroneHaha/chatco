import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Laravel Echo's Pusher broadcaster looks up `window.Pusher` to instantiate
// the Pusher client. Assign it before creating the Echo singleton.
declare global {
  interface Window {
    Pusher: typeof Pusher;
  }
}

if (typeof window !== 'undefined') {
  window.Pusher = Pusher;
}

let echoInstance: Echo<'pusher'> | null = null;

export function getEcho(): Echo<'pusher'> {
  if (echoInstance) {
    return echoInstance;
  }

  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_APP_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_APP_CLUSTER;

  if (!pusherKey || !pusherCluster) {
    throw new Error(
      'Missing NEXT_PUBLIC_PUSHER_APP_KEY or NEXT_PUBLIC_PUSHER_APP_CLUSTER in environment'
    );
  }

  echoInstance = new Echo<'pusher'>({
    broadcaster: 'pusher',
    key: pusherKey,
    cluster: pusherCluster,
    forceTLS: true,
    encrypted: true,
    enabledTransports: ['ws', 'wss'],
    // Private hail channels authenticate through the same-origin Next proxy,
    // which can safely read the httpOnly Sanctum token cookie.
    authEndpoint: '/api/broadcasting/auth',
  });

  return echoInstance;
}

export default echoInstance;
