import { google } from "googleapis";
import credentials from "../../config/credentials.json";

export default async function handler(req, res) {
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });

  const sheets = google.sheets({ version: "v4", auth });
  const spreadsheetId = "1-8ecZHOSpWv29shfgFUuL-DQb_fuoBj7kJLIvZmmNZc";

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "Sheet1!A:A",
  });

  const tasks = response.data.values ? response.data.values.flat() : [];
  res.status(200).json(tasks);
}
