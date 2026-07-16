import webpush from "web-push";

let activePublicKey = null;

const initWebPush = () => {
  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  const mailto = process.env.VAPID_MAILTO || "mailto:support@truthndare.com";

  if (!publicKey || !privateKey) {
    console.warn("⚠️  VAPID keys not configured in environment. Generating ephemeral VAPID keys on-the-fly for testing.");
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
  }

  webpush.setVapidDetails(mailto, publicKey, privateKey);
  activePublicKey = publicKey;
  return publicKey;
};

const getPublicKey = () => {
  if (!activePublicKey) {
    return initWebPush();
  }
  return activePublicKey;
};

export { initWebPush, getPublicKey, webpush };
