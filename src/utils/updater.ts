import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdates() {
  try {
    const update = await check();
    if (update) {
      const shouldUpdate = confirm(
        `พบเวอร์ชั่นใหม่ ${update.version}\n\n` +
          `รายละเอียดการอัพเดท:\n${update.body}\n\n` +
          "ต้องการอัพเดทเดี๋ยวนี้หรือไม่?"
      );

      if (shouldUpdate) {
        await update.downloadAndInstall();
        await relaunch();
      }
    }
  } catch (error) {
    console.error("เกิดข้อผิดพลาดในการตรวจสอบอัพเดท:", error);
  }
}
