export async function checkForUpdates() {
  try {
    console.log("Starting update check...");
    console.log("Current URL:", window.location.href);
    const update = await window.__TAURI__.core.invoke("plugin:updater|check", {
      options: { debug: true }
    });
    console.log("Update response:", update);
  } catch (err) {
    console.error("Update error full details:", err);
    console.error("Error message:", err.message);
    console.error("Error cause:", err.cause);
  }
}
