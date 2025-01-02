import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { confirm, message } from "@tauri-apps/plugin-dialog";

export async function checkForUpdates() {
  try {
    const update = await check();

    if (update?.available) {
      const confirmed = await confirm(
        `มีเวอร์ชั่นใหม่ ${update.manifest?.version} พร้อมให้อัพเดท\n\nรายละเอียด: ${update.manifest?.body}`,
        { title: "อัพเดทแอพพลิเคชั่น" }
      );

      if (confirmed) {
        await message("กำลังติดตั้งอัพเดท กรุณารอสักครู่...", {
          title: "กำลังอัพเดท"
        });

        // ใช้ downloadAndInstall แทน installUpdate
        await update.downloadAndInstall();

        await message("ติดตั้งอัพเดทเสร็จสิ้น แอพจะรีสตาร์ทอัตโนมัติ", {
          title: "ติดตั้งสำเร็จ"
        });

        await relaunch();
      }
    }
  } catch (error) {
    await message(`เกิดข้อผิดพลาด: ${error}`, {
      title: "Error",
      type: "error"
    });
  }
}
