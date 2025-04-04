import { google } from "googleapis";

// Mendapatkan client otentikasi
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

// Helper function to filter tasks by date range
const filterTasksByDateRange = (tasks, startDate, endDate) => {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;
  
  if (!start && !end) return tasks;
  
  return tasks.filter(task => {
    const taskDate = new Date(task.date);
    
    if (start && end) {
      return taskDate >= start && taskDate <= end;
    } else if (start) {
      return taskDate >= start;
    } else if (end) {
      return taskDate <= end;
    }
    
    return true;
  });
};

// Helper function to filter tasks by specific date
const filterTasksByDate = (tasks, date) => {
  const targetDate = new Date(date);
  // Reset hours to compare dates only, not time
  targetDate.setHours(0, 0, 0, 0);
  
  return tasks.filter(task => {
    const taskDate = new Date(task.date);
    taskDate.setHours(0, 0, 0, 0);
    return taskDate.getTime() === targetDate.getTime();
  });
};

// Helper function to parse URL search params
const parseURLSearchParams = (url) => {
  try {
    const searchParams = new URL(url).searchParams;
    const params = {};
    
    if (searchParams.has('date')) {
      params.date = searchParams.get('date');
    }
    
    if (searchParams.has('startDate')) {
      params.startDate = searchParams.get('startDate');
    }
    
    if (searchParams.has('endDate')) {
      params.endDate = searchParams.get('endDate');
    }
    
    if (searchParams.has('viewMode')) {
      params.viewMode = searchParams.get('viewMode');
    }
    
    return params;
  } catch (error) {
    console.error("Error parsing URL search params:", error);
    return {};
  }
};

// GET - Fetch all tasks with optional date filtering
export async function GET(req) {
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
    let tasks = rows.slice(1).map(row => {
      const task = {};
      headers.forEach((header, index) => {
        task[header] = row[index] || "";
      });
      return task;
    });
    
    // Apply date filtering if parameters are present
    const params = parseURLSearchParams(req.url);
    
    if (params.viewMode === 'day' && params.date) {
      tasks = filterTasksByDate(tasks, params.date);
    } else if ((params.viewMode === 'week' || params.viewMode === 'month') && 
               (params.startDate || params.endDate)) {
      tasks = filterTasksByDateRange(tasks, params.startDate, params.endDate);
    }
    
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

// PUT - Update a task
export async function PUT(req, { params }) {
  try {
    const taskId = params.id;
    const taskData = await req.json();
    
    if (!taskId) {
      return new Response(JSON.stringify({ error: "Task ID is required" }), { status: 400 });
    }
    
    const auth = getAuthClient();
    const sheetTitle = await getSheetTitle(auth);
    
    // Get all tasks to find the row number of the target task
    const range = `${sheetTitle}!A1:F1000`;
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    
    // Find the row with the matching ID
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === taskId) {
        rowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    
    // Prepare updated row data
    const updatedRow = [
      taskId,
      taskData.title || rows[rowIndex - 1][1],
      taskData.description !== undefined ? taskData.description : rows[rowIndex - 1][2],
      taskData.date || rows[rowIndex - 1][3],
      taskData.priority || rows[rowIndex - 1][4],
      taskData.status || rows[rowIndex - 1][5]
    ];
    
    // Update the row
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetTitle}!A${rowIndex}:F${rowIndex}`,
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

// DELETE - Delete a task
export async function DELETE(req, { params }) {
  try {
    const taskId = params.id;
    
    if (!taskId) {
      return new Response(JSON.stringify({ error: "Task ID is required" }), { status: 400 });
    }
    
    const auth = getAuthClient();
    const sheetTitle = await getSheetTitle(auth);
    
    // Get all tasks to find the row number of the target task
    const range = `${sheetTitle}!A1:F1000`;
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range,
    });
    
    const rows = response.data.values || [];
    if (rows.length <= 1) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    
    // Find the row with the matching ID
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === taskId) {
        rowIndex = i + 1; // +1 because sheets are 1-indexed
        break;
      }
    }
    
    if (rowIndex === -1) {
      return new Response(JSON.stringify({ error: "Task not found" }), { status: 404 });
    }
    
    // Delete the row by clearing its contents
    await sheets.spreadsheets.values.clear({
      auth,
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetTitle}!A${rowIndex}:F${rowIndex}`,
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