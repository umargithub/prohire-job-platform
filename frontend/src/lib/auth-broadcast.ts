/**
 * Cross-tab auth signalling over BroadcastChannel.
 *
 * A tab-lifetime singleton channel. BroadcastChannel does not deliver a
 * message back to the instance that posted it, so the tab initiating a
 * logout won't re-handle its own broadcast — only sibling tabs react.
 * No-ops safely on the server and in browsers without BroadcastChannel.
 */
const CHANNEL_NAME = "prohire:auth";

type AuthMessage = { type: "logout" };

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (
    typeof window === "undefined" ||
    typeof BroadcastChannel === "undefined"
  ) {
    return null;
  }
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

/** Notify other tabs that the user has logged out. */
export function broadcastLogout(): void {
  getChannel()?.postMessage({ type: "logout" } satisfies AuthMessage);
}

/** Subscribe to logout signals from other tabs. Returns an unsubscribe fn. */
export function onAuthLogout(handler: () => void): () => void {
  const ch = getChannel();
  if (!ch) return () => {};

  const listener = (event: MessageEvent<AuthMessage>): void => {
    if (event.data?.type === "logout") handler();
  };

  ch.addEventListener("message", listener);
  return () => ch.removeEventListener("message", listener);
}
