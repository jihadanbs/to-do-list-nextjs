import { google } from "googleapis";
import credentials from "../../config/credentials.json";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { index } = req.body;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = "1-8ecZHOSpWv29shfgFUuL-DQb_fuoBj7kJLIvZmmNZc";

  // Menghapus dengan menghapus isinya
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `Sheet1!A${index + 1}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[""]] },
  });

  res.status(200).json({ message: "Task deleted successfully" });
}
