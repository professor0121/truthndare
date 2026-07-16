self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "Truth & Dare Alert";
    const options = {
      body: data.body || "",
      icon: data.icon || "/vercel.svg",
      badge: "/vercel.svg",
      tag: data.tag || "general",
      data: data.data || {},
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (error) {
    console.error("Failed to parse push notification payload:", error);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const roomCode = event.notification.data?.roomCode;
  const targetUrl = roomCode ? `/room/${roomCode}` : "/dashboard";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // If window is already open, focus it and redirect
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus().then((focusedClient) => {
            if ("navigate" in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      // If no window is open, open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
