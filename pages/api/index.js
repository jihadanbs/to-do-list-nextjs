import { useState, useEffect } from "react";
import axios from "axios";

export default function TodoList() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    const res = await axios.get("/api/getTasks");
    setTasks(res.data);
  };

  const addTask = async () => {
    if (!newTask.trim()) return;
    await axios.post("/api/addTask", { task: newTask });
    setNewTask("");
    fetchTasks();
  };

  const deleteTask = async (index) => {
    await axios.post("/api/deleteTask", { index });
    fetchTasks();
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">To-Do List</h1>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="border p-2 w-full"
          placeholder="Tambah tugas..."
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button onClick={addTask} className="bg-blue-500 text-white p-2 rounded">
          Tambah
        </button>
      </div>
      <ul>
        {tasks.map((task, index) => (
          <li key={index} className="flex justify-between border p-2 mb-2">
            {task}
            <button
              onClick={() => deleteTask(index)}
              className="bg-red-500 text-white px-2 rounded"
            >
              Hapus
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
