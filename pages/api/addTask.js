import { google } from "googleapis";
import credentials from "../../config/credentials.json";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { task } = req.body;
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = "1-8ecZHOSpWv29shfgFUuL-DQb_fuoBj7kJLIvZmmNZc";

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "Sheet1!A:A",
    valueInputOption: "USER_ENTERED",
    requestBody: { values: [[task]] },
  });

  res.status(200).json({ message: "Task added successfully" });
}
