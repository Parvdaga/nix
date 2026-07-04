self.addEventListener("push", (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    const title = data.title || "Nix";
    const options = {
      body: data.body || "New update in your group!",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/"
      }
    };
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error("Error parsing push payload:", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";
  
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there is already a window open with this app
      if (clientList.length > 0) {
        let client = clientList[0];
        // Focus first focused client, or fallback to first overall
        for (let c of clientList) {
          if (c.focused) {
            client = c;
            break;
          }
        }
        return client.focus().then(() => {
          return client.navigate(targetUrl);
        });
      }
      // If no window is open, open a new one
      return clients.openWindow(targetUrl);
    })
  );
});
