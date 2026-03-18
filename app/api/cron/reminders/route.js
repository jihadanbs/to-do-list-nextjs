import { google } from "googleapis";
import { sendTelegramMessage } from "@/lib/telegram";

export async function GET(req) {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  try {
    const upcomingTasks = tasks.filter(t => {
       const taskDate = t.date.split('T')[0];
       return taskDate === todayStr && t.status !== "Completed";
    });

    if (upcomingTasks.length > 0) {
      let msg = `⏰ <b>Reminder Tugas Hari Ini!</b>\n\n`;
      upcomingTasks.forEach(t => {
        msg += `- ${t.title} (${t.startTime})\n`;
      });
      await sendTelegramMessage(msg);
    }

    return new Response("Reminders sent", { status: 200 });
  } catch (e) {
    return new Response("Error", { status: 500 });
  }
}