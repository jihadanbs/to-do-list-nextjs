// app/api/tasks/route.js
import { google } from "googleapis";
import path from "path";
import fs from "fs";

// Fungsi untuk mendekode kredensial Base64 dan menyimpannya sebagai file JSON
const decodeBase64ToJSON = () => {
  const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
  if (!base64Credentials) {
    throw new Error("Base64 credentials not found in environment variables.");
  }

  const jsonString = Buffer.from(base64Credentials, "base64").toString("utf-8");
  const credentialsPath = path.resolve("config", "credentials.json");

  fs.writeFileSync(credentialsPath, jsonString);
  console.log("Credentials file saved successfully.");
  
  return credentialsPath;
};

// Mendapatkan client otentikasi
const sheets = google.sheets("v4");

const getAuthClient = () => {
  try {
    // Mendekode kredensial Base64 dan simpan sebagai file JSON
    const credentialsPath = decodeBase64ToJSON();
    console.log("Looking for credentials at:", credentialsPath);

    const credentials = JSON.parse(fs.readFileSync(credentialsPath, "utf8"));
    
    const auth = new google.auth.JWT(
      credentials.client_email,
      undefined,
      credentials.private_key,
      ["https://www.googleapis.com/auth/spreadsheets"]
    );
    
    return auth;
  } catch (error) {
    console.error("Auth client error:", error);
    throw error;
  }
};

const SPREADSHEET_ID = "1-8ecZHOSpWv29shfgFUuL-DQb_fuoBj7kJLIvZmmNZc";

// Helper function to get sheet title
const getSheetTitle = async (auth) => {
  const spreadsheet = await sheets.spreadsheets.get({
    auth,
    spreadsheetId: SPREADSHEET_ID
  });
  
  // Look for a TaskManager sheet or use the first sheet
  const taskSheet = spreadsheet.data.sheets.find(
    sheet => sheet.properties.title === "TaskManager"
  ) || spreadsheet.data.sheets[0];
  
  return taskSheet.properties.title;
};

// Function to ensure the sheet has the correct headers
const ensureHeaders = async (auth, sheetTitle) => {
  try {
    const range = `${sheetTitle}!A1:F1`;
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range,
    });

    const headers = response.data.values?.[0] || [];
    const requiredHeaders = ["id", "title", "description", "date", "priority", "status"];
    
    // If headers don't exist or are incorrect, create them
    if (headers.length !== requiredHeaders.length || 
        !requiredHeaders.every((h, i) => headers[i] === h)) {
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId: SPREADSHEET_ID,
        range,
        valueInputOption: "RAW",
        requestBody: {
          values: [requiredHeaders]
        }
      });
      console.log("Headers updated successfully");
    }
  } catch (error) {
    console.error("Error ensuring headers:", error);
    throw error;
  }
};

// GET - Fetch all tasks
export async function GET() {
  try {
    const auth = getAuthClient();
    const sheetTitle = await getSheetTitle(auth);
    await ensureHeaders(auth, sheetTitle);
    
    const range = `${sheetTitle}!A1:F1000`;
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    
    const rows = response.data.values || [];
    
    // First row contains headers
    if (rows.length <= 1) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    
    const headers = rows[0];
    const tasks = rows.slice(1).map(row => {
      const task = {};
      headers.forEach((header, index) => {
        task[header] = row[index] || "";
      });
      return task;
    });
    
    return new Response(JSON.stringify(tasks), { status: 200 });
  } catch (error) {
    console.error("GET error details:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to fetch tasks", 
      details: error.message
    }), { status: 500 });
  }
}

// POST - Create a new task
export async function POST(req) {
  try {
    const taskData = await req.json();
    
    if (!taskData.title) {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 });
    }
    
    const auth = getAuthClient();
    const sheetTitle = await getSheetTitle(auth);
    await ensureHeaders(auth, sheetTitle);
    
    // Generate a unique ID
    const id = Date.now().toString();
    
    // Prepare row data
    const newRow = [
      id,
      taskData.title,
      taskData.description || "",
      taskData.date || new Date().toISOString(),
      taskData.priority || "Medium",
      taskData.status || "Pending"
    ];
    
    // Append the new row
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetTitle}!A:F`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [newRow] },
    });
    
    return new Response(JSON.stringify({ 
      message: "Task created successfully",
      id
    }), { status: 201 });
  } catch (error) {
    console.error("POST error details:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to create task", 
      details: error.message
    }), { status: 500 });
  }
}