import { google } from "googleapis";

const sheets = google.sheets("v4");

const getAuthClient = () => {
  try {
    const base64Credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64;
    if (!base64Credentials) {
      throw new Error("Base64 credentials not found in environment variables.");
    }

    const jsonString = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const credentials = JSON.parse(jsonString);
    
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
  
  const taskSheet = spreadsheet.data.sheets.find(
    sheet => sheet.properties.title === "TaskManager"
  ) || spreadsheet.data.sheets[0];
  
  return taskSheet.properties.title;
};

// Helper function to find a task by id
const findTask = async (auth, sheetTitle, id) => {
  const range = `${sheetTitle}!A1:H1000`;
  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId: SPREADSHEET_ID,
    range,
  });
  
  const rows = response.data.values || [];
  if (rows.length <= 1) return { found: false }; // No tasks
  
  const headers = rows[0];
  
  // Find the row with matching id
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === id) {
      return { 
        found: true, 
        rowIndex: i + 1, // 1-based index for sheets API
        headers
      };
    }
  }
  
  return { found: false };
};

// PUT - Update task
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const taskData = await req.json();
    
    if (!taskData.title) {
      return new Response(JSON.stringify({ error: "Title is required" }), { status: 400 });
    }
    
    const auth = getAuthClient();
    const sheetTitle = await getSheetTitle(auth);
    const { found, rowIndex, headers } = await findTask(auth, sheetTitle, id);
    
    if (!found) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    
    // Prepare updated row data
    const updatedRow = [
      id, // Keep the original ID
      taskData.title,
      taskData.description || "",
      taskData.date || new Date().toISOString(),
      taskData.startTime,
      taskData.endTime,
      taskData.priority || "Medium",
      taskData.status || "Pending"
    ];
    
    // Update the row
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetTitle}!A${rowIndex}:H${rowIndex}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: [updatedRow] },
    });
    
    return new Response(JSON.stringify({ 
      message: "Task updated successfully"
    }), { status: 200 });
  } catch (error) {
    console.error("PUT error details:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to update task", 
      details: error.message
    }), { status: 500 });
  }
}

// DELETE - Delete task
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    
    const auth = getAuthClient();
    const sheetTitle = await getSheetTitle(auth);
    const { found, rowIndex } = await findTask(auth, sheetTitle, id);
    
    if (!found) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    
    // Get the spreadsheet ID
    const spreadsheet = await sheets.spreadsheets.get({
      auth,
      spreadsheetId: SPREADSHEET_ID
    });
    
    const sheetId = spreadsheet.data.sheets.find(
      sheet => sheet.properties.title === sheetTitle
    ).properties.sheetId;
    
    // Delete the row by making a batchUpdate request
    await sheets.spreadsheets.batchUpdate({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: rowIndex - 1, // 0-based index for batchUpdate
                endIndex: rowIndex // exclusive end index
              }
            }
          }
        ]
      }
    });
    
    return new Response(JSON.stringify({ 
      message: "Task deleted successfully"
    }), { status: 200 });
  } catch (error) {
    console.error("DELETE error details:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to delete task", 
      details: error.message
    }), { status: 500 });
  }
}

// GET - Get a single task by ID
export async function GET(req, { params }) {
  try {
    const { id } = params;
    
    const auth = getAuthClient();
    const sheetTitle = await getSheetTitle(auth);
    const { found, rowIndex, headers } = await findTask(auth, sheetTitle, id);
    
    if (!found) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    
    // Get the task data
    const range = `${sheetTitle}!A${rowIndex}:H${rowIndex}`;
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    
    const taskData = response.data.values?.[0] || [];
    
    const task = {};
    headers.forEach((header, index) => {
      task[header] = taskData[index] || "";
    });
    
    return new Response(JSON.stringify(task), { status: 200 });
  } catch (error) {
    console.error("GET error details:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to get task", 
      details: error.message
    }), { status: 500 });
  }
}