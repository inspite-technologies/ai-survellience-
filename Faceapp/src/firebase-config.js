import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { API_INSTANCE } from "./components/services/axiosClient";
import { jwtDecode } from "jwt-decode";

const firebaseConfig = {
  apiKey: "AIzaSyBFQOv1mnKdPz8-GVseluohrC1kRKLnLJ8",
  authDomain: "ai-survellience.firebaseapp.com",
  projectId: "ai-survellience",
  storageBucket: "ai-survellience.firebasestorage.app",
  messagingSenderId: "778995047406",
  appId: "1:778995047406:web:af56c2f1b367fb77698cff",
  measurementId: "G-0BK6GB649E"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

/**
 * Register a token with the backend for a specific user.
 * Can be called multiple times (e.g., after login).
 */
export const registerTokenWithBackend = async (token, userId) => {
  if (!token || !userId) return;

  try {
    console.log(`📡 [FCM] Registering token for user ${userId}...`);
    await API_INSTANCE.post('/notifications/register-token', {
      userId,
      token,
      deviceType: 'web'
    });
    console.log("✅ [FCM] Token registered with backend server");
  } catch (apiErr) {
    console.warn("⚠️ [FCM] Backend registration failed:", apiErr.response?.data?.message || apiErr.message);
  }
};

/**
 * Request notification permissions and return the FCM token.
 */
export const requestForToken = async () => {
  try {
    if (!("serviceWorker" in navigator)) {
      console.error("❌ [FCM] Service Worker not supported in this browser");
      return null;
    }

    // 1. Explicitly request permission if not already granted
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn("⚠️ [FCM] Notification permission denied by user");
        return null;
      }
    }

    // 2. Register/Retrieve Service Worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    console.log("✅ [FCM] Service Worker active:", registration.scope);

    // 3. Get FCM Token
    const token = await getToken(messaging, {
      vapidKey: "BEtonzVBd49Em3AMQGZ_XPAOd3QgKpiw0ywSDyusPPCne1GVt8QvqRJx43QPjlbJ8wFUzo_C54F6BdYyotDmWw4",
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("🔥 [FCM] Token ready:", token);
      
      // Auto-register if user is already logged in
      const jwtToken = localStorage.getItem('token');
      if (jwtToken) {
        try {
          const decoded = jwtDecode(jwtToken);
          if (decoded.id) {
            await registerTokenWithBackend(token, decoded.id);
          }
        } catch (decodeErr) {
          console.error("❌ [FCM] Error decoding JWT:", decodeErr.message);
        }
      }
      return token;
    } else {
      console.warn("⚠️ [FCM] No registration token available.");
      return null;
    }
  } catch (err) {
    console.error("❌ [FCM] Error retrieving token:", err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("📩 [FCM] Foreground message mapping:", payload);
      resolve(payload);
    });
  });

export { messaging };
