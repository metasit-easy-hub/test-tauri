import { checkForUpdates } from "./utils/updater";
const { invoke } = window.__TAURI__.core;

let greetInputEl;
let greetMsgEl;

async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsgEl.textContent = await invoke("greet", { name: greetInputEl.value });
}

window.addEventListener("DOMContentLoaded", async () => {
  // เช็คอัพเดทตอนเริ่มต้นแอพ
  await checkForUpdates();

  // โค้ดเดิม
  console.log("DOMContentLoaded");
  greetInputEl = document.querySelector("#greet-input");
  greetMsgEl = document.querySelector("#greet-msg");
  document.querySelector("#greet-form")?.addEventListener("submit", e => {
    e.preventDefault();
    greet();
  });

  // เช็คอัพเดททุก 1 ชั่วโมง
  setInterval(async () => {
    await checkForUpdates();
  }, 1000 * 60 * 60);
});
