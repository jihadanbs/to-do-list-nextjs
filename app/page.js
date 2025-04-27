"use client";
import React from 'react';
import { useEffect, useState } from "react";
import axios from "axios";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Plus, 
  Calendar as CalendarIcon, 
  Trash2, 
  Edit, 
  Filter, 
  Loader2,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  List
} from "lucide-react";
import { BarChart, LineChart, AreaChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Toaster, toast } from "react-hot-toast";

export default function Home() {
  const [tasks, setTasks] = useState([]);
  const [filteredTasks, setFilteredTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  
  // View Mode state
  const [viewMode, setViewMode] = useState("list"); // list, day, week, month
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateRange, setDateRange] = useState({
    start: startOfWeek(new Date(), { weekStartsOn: 1 }),
    end: endOfWeek(new Date(), { weekStartsOn: 1 })
  });
  
  // Form fields
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskDate, setTaskDate] = useState(new Date());
  const [taskPriority, setTaskPriority] = useState("Medium");
  const [taskStatus, setTaskStatus] = useState("Pending");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Confirmation dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  
  // Stats
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    highPriorityTasks: 0,
    tasksByStatus: {},
    tasksByPriority: {}
  });
  
  // Fetch tasks when component mounts
  useEffect(() => {
    fetchTasks();
  }, []);
  
  // Filter tasks when search term or filters change
  useEffect(() => {
    applyFilters();
  }, [tasks, searchTerm, filterStatus, filterPriority, viewMode, selectedDate, dateRange]);
  
  // Update statistics when tasks change
  useEffect(() => {
    updateStats();
  }, [tasks]);
  
  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/tasks");
      // Ensure each task has a date as a Date object
      const tasksWithDates = data.map(task => ({
        ...task,
        dateObj: new Date(task.date)
      }));
      setTasks(tasksWithDates);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Gagal memuat tugas. Silakan coba lagi nanti.");
    } finally {
      setLoading(false);
    }
  };
  
  const updateStats = () => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === "Completed").length;
    const highPriorityTasks = tasks.filter(task => task.priority === "High").length;
    
    // Group by status
    const tasksByStatus = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {});
    
    // Group by priority
    const tasksByPriority = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {});
    
    setStats({
      totalTasks,
      completedTasks,
      highPriorityTasks,
      tasksByStatus,
      tasksByPriority
    });
  };
  
  const applyFilters = () => {
    let result = [...tasks];
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(task => 
        task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply status filter
    if (filterStatus !== "all") {
      result = result.filter(task => task.status === filterStatus);
    }
    
    // Apply priority filter
    if (filterPriority !== "all") {
      result = result.filter(task => task.priority === filterPriority);
    }
    
    // Apply date filters based on view mode
    if (viewMode === "day") {
      result = result.filter(task => 
        isSameDay(new Date(task.date), selectedDate)
      );
    } else if (viewMode === "week") {
      result = result.filter(task => 
        isWithinInterval(new Date(task.date), dateRange)
      );
    } else if (viewMode === "month") {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      result = result.filter(task => 
        isWithinInterval(new Date(task.date), { start: monthStart, end: monthEnd })
      );
    }
    
    setFilteredTasks(result);
  };
  
  const resetFilters = () => {
    setSearchTerm("");
    setFilterStatus("all");
    setFilterPriority("all");
  };
  
  const resetForm = () => {
    setTaskTitle("");
    setTaskDescription("");
    setTaskDate(new Date());
    setTaskPriority("Medium");
    setTaskStatus("Pending");
    setCurrentTaskId(null);
    setIsEditMode(false);
  };
  
  const openAddDialog = () => {
    resetForm();
    // Set default date based on current view
    if (viewMode === "day") {
      setTaskDate(selectedDate);
    }
    setIsDialogOpen(true);
    setIsEditMode(false);
  };
  
  const openEditDialog = (task) => {
    setCurrentTaskId(task.id);
    setTaskTitle(task.title);
    setTaskDescription(task.description || "");
    setTaskDate(new Date(task.date));
    setTaskPriority(task.priority);
    setTaskStatus(task.status);
    setIsDialogOpen(true);
    setIsEditMode(true);
  };
  
  const openDeleteConfirm = (id) => {
    setTaskToDelete(id);
    setIsDeleteConfirmOpen(true);
  };
  
  const handleSaveTask = async () => {
    if (!taskTitle.trim()) {
      toast.error("Judul tugas wajib diisi");
      return;
    }
    
    setLoading(true);
    
    const taskData = {
      title: taskTitle,
      description: taskDescription,
      date: taskDate.toISOString(),
      priority: taskPriority,
      status: taskStatus
    };
    
    try {
      if (isEditMode) {
        await axios.put(`/api/tasks/${currentTaskId}`, taskData);
        toast.success("Tugas berhasil diperbarui");
      } else {
        await axios.post("/api/tasks", taskData);
        toast.success("Tugas berhasil ditambahkan");
      }
      
      setIsDialogOpen(false);
      fetchTasks();
      resetForm();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(
        isEditMode
          ? "Gagal memperbarui tugas. Silakan coba lagi."
          : "Gagal menambahkan tugas. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    setLoading(true);
    try {
      await axios.delete(`/api/tasks/${taskToDelete}`);
      fetchTasks();
      setIsDeleteConfirmOpen(false);
      toast.success("Tugas berhasil dihapus");
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Gagal menghapus tugas. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "bg-red-100 text-red-800";
      case "Medium": return "bg-yellow-100 text-yellow-800";
      case "Low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-blue-100 text-blue-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };
  
  // Handle date navigation
  const goToPreviousDate = () => {
    if (viewMode === "day") {
      const prevDay = new Date(selectedDate);
      prevDay.setDate(prevDay.getDate() - 1);
      setSelectedDate(prevDay);
    } else if (viewMode === "week") {
      const prevWeekStart = new Date(dateRange.start);
      prevWeekStart.setDate(prevWeekStart.getDate() - 7);
      const prevWeekEnd = new Date(dateRange.end);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
      setDateRange({ start: prevWeekStart, end: prevWeekEnd });
      setSelectedDate(prevWeekStart);
    } else if (viewMode === "month") {
      const prevMonth = new Date(selectedDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setSelectedDate(prevMonth);
    }
  };
  
  const goToNextDate = () => {
    if (viewMode === "day") {
      const nextDay = new Date(selectedDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setSelectedDate(nextDay);
    } else if (viewMode === "week") {
      const nextWeekStart = new Date(dateRange.start);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(dateRange.end);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
      setDateRange({ start: nextWeekStart, end: nextWeekEnd });
      setSelectedDate(nextWeekStart);
    } else if (viewMode === "month") {
      const nextMonth = new Date(selectedDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setSelectedDate(nextMonth);
    }
  };
  
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    
    // Update date ranges based on view mode
    if (mode === "week") {
      setDateRange({
        start: startOfWeek(selectedDate, { weekStartsOn: 1 }),
        end: endOfWeek(selectedDate, { weekStartsOn: 1 })
      });
    }
  };
  
  // Format date range for display
  const formatDateRange = () => {
    if (viewMode === "day") {
      return format(selectedDate, "d MMMM yyyy", { locale: id });
    } else if (viewMode === "week") {
      return `${format(dateRange.start, "d MMM", { locale: id })} - ${format(dateRange.end, "d MMM yyyy", { locale: id })}`;
    } else if (viewMode === "month") {
      return format(selectedDate, "MMMM yyyy", { locale: id });
    }
    return "";
  };
  
  // Generate days for month view
  const getDaysInMonth = () => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(selectedDate);
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  };
  
  // Get tasks for a specific day
  const getTasksForDay = (day) => {
    return tasks.filter(task => isSameDay(new Date(task.date), day));
  };
  
  // Render day cell for month view
  const renderDayCell = (day) => {
    const dayTasks = getTasksForDay(day);
    const isToday = isSameDay(day, new Date());
    
    return (
      <div 
        key={day.toString()} 
        className={`border rounded-md p-2 h-32 overflow-y-auto ${isToday ? 'bg-blue-50 border-blue-400' : ''}`}
      >
        <div className="font-medium text-sm mb-1">
          {format(day, "d", { locale: id })}
        </div>
        {dayTasks.length > 0 ? (
          <div className="space-y-1">
            {dayTasks.map((task) => (
              <div 
                key={task.id} 
                className={`p-1 rounded text-xs truncate cursor-pointer hover:bg-gray-100 ${getPriorityColor(task.priority)}`}
                onClick={() => openEditDialog(task)}
              >
                {task.title}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-400 text-xs">Tidak ada tugas</div>
        )}
      </div>
    );
  };
  
  // Render day for week view
  const renderWeekDay = (day) => {
    const dayTasks = getTasksForDay(day);
    const isToday = isSameDay(day, new Date());
    const dayName = format(day, "EEE", { locale: id });
    const dayNumber = format(day, "d", { locale: id });
    
    return (
      <div key={day.toString()} className="flex-1 min-w-[120px]">
        <div className={`text-center p-2 ${isToday ? 'bg-blue-100 rounded-t-md' : 'bg-gray-50'}`}>
          <div className="font-medium">{dayName}</div>
          <div className={`text-lg ${isToday ? 'font-bold' : ''}`}>{dayNumber}</div>
        </div>
        <div className="border rounded-b-md p-2 h-64 overflow-y-auto">
          {dayTasks.length > 0 ? (
            <div className="space-y-2">
              {dayTasks.map((task) => (
                <div 
                  key={task.id} 
                  className={`p-2 rounded shadow-sm cursor-pointer hover:shadow ${getStatusColor(task.status)}`}
                  onClick={() => openEditDialog(task)}
                >
                  <div className="font-medium truncate">{task.title}</div>
                  <div className="flex justify-between items-center mt-1 text-xs">
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-4">Tidak ada tugas</div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <Toaster position="top-right" reverseOrder={false} />
      
      <div className="max-w-7xl mx-auto">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Manajemen Tugas</h1>
            <Button 
              onClick={openAddDialog} 
              className="mt-2 sm:mt-0 bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" /> Tambah Tugas
            </Button>
          </div>

          {/* Dashboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{stats.totalTasks}</div>
                <div className="text-sm text-gray-500">Total Tugas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">{stats.completedTasks}</div>
                <div className="text-sm text-gray-500">Tugas Selesai</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">{stats.highPriorityTasks}</div>
                <div className="text-sm text-gray-500">Prioritas Tinggi</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalTasks > 0
                    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-gray-500">Progres</div>
              </CardContent>
            </Card>
          </div>
          
          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={handleViewModeChange} className="mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
              {/* Tabs List */}
              <TabsList className="mb-2 md:mb-0">
                <TabsTrigger value="list">
                  <List className="w-4 h-4 mr-2" /> Daftar
                </TabsTrigger>
                <TabsTrigger value="day">
                  <CalendarIcon className="w-4 h-4 mr-2" /> Hari
                </TabsTrigger>
                <TabsTrigger value="week">
                  <CalendarIcon className="w-4 h-4 mr-2" /> Minggu
                </TabsTrigger>
                <TabsTrigger value="month">
                  <CalendarIcon className="w-4 h-4 mr-2" /> Bulan
                </TabsTrigger>
              </TabsList>

              {/* Navigasi Tanggal */}
              {viewMode !== "list" && (
                <div className="flex items-center gap-2 md:ml-auto">
                  <Button size="sm" variant="outline" onClick={goToPreviousDate}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="font-medium">{formatDateRange()}</div>
                  <Button size="sm" variant="outline" onClick={goToNextDate}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            
            {/* Filter Controls - Only show in list view */}
            {viewMode === "list" && (
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Cari tugas..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Pending">Tertunda</SelectItem>
                      <SelectItem value="In Progress">Sedang Dikerjakan</SelectItem>
                      <SelectItem value="Completed">Selesai</SelectItem>
                      <SelectItem value="Cancelled">Dibatalkan</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filterPriority} onValueChange={setFilterPriority}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder="Prioritas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Prioritas</SelectItem>
                      <SelectItem value="High">Tinggi</SelectItem>
                      <SelectItem value="Medium">Sedang</SelectItem>
                      <SelectItem value="Low">Rendah</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Button variant="outline" onClick={resetFilters} className="w-full sm:w-auto">
                    <Filter className="w-4 h-4 mr-2" /> Reset
                  </Button>
                </div>
              </div>
            )}
            
            {/* Content for different views */}
            <TabsContent value="list">
              {loading && tasks.length === 0 ? (
                <div className="flex justify-center items-center py-20">
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                  <span className="ml-2 text-gray-500">Memuat tugas...</span>
                </div>
              ) : filteredTasks.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul</TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead>Prioritas</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[100px]">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTasks.map((task) => (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{task.title}</div>
                              {task.description && (
                                <div className="text-sm text-gray-500 truncate max-w-md">
                                  {task.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                              {format(new Date(task.date), "d MMM yyyy", { locale: id })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPriorityColor(task.priority)}>
                              {task.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(task.status)}>
                              {task.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => openEditDialog(task)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-500 hover:text-red-700" 
                                onClick={() => openDeleteConfirm(task.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-20 text-gray-500">
                  {searchTerm || filterStatus !== "all" || filterPriority !== "all" ? (
                    <div>
                      <p>Tidak ada tugas yang sesuai dengan filter Anda</p>
                      <Button variant="link" onClick={resetFilters}>Hapus filter</Button>
                    </div>
                  ) : (
                    <p>Belum ada tugas. Tambahkan tugas pertama Anda untuk memulai!</p>
                  )}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="day">
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-medium">
                    Tugas pada {format(selectedDate, "EEEE, d MMMM yyyy", { locale: id })}
                  </h2>
                  <div>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm">
                          <CalendarIcon className="mr-2 h-4 w-4" /> Pilih Tanggal
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => setSelectedDate(date || new Date())}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                {filteredTasks.length > 0 ? (
                  <div className="space-y-2">
                    {filteredTasks.map((task) => (
                      <div 
                        key={task.id} 
                        className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => openEditDialog(task)}
                      >
                        <div className="flex-1">
                          <h3 className="font-medium">{task.title}</h3>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-red-500 hover:text-red-700" 
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteConfirm(task.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 text-gray-500">
                    <p>Tidak ada tugas pada tanggal ini</p>
                    <Button variant="link" onClick={openAddDialog}>Tambah tugas baru</Button>
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="week">
              <div className="flex gap-2 overflow-x-auto pb-4">
                {eachDayOfInterval(dateRange).map(renderWeekDay)}
              </div>
            </TabsContent>
            
            <TabsContent value="month">
              <div className="grid grid-cols-7 gap-2">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((day) => (
                  <div key={day} className="text-center font-medium p-2">
                    {day}
                  </div>
                ))}
                {getDaysInMonth().map(renderDayCell)}
                </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Dialog untuk Tambah/Edit Tugas */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{isEditMode ? "Edit Tugas" : "Tambah Tugas Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                Judul Tugas <span className="text-red-500">*</span>
              </label>
              <Input
                id="title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Masukkan judul tugas"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Deskripsi
              </label>
              <Textarea
                id="description"
                value={taskDescription}
                onChange={(e) => setTaskDescription(e.target.value)}
                placeholder="Masukkan deskripsi tugas (opsional)"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="date" className="text-sm font-medium">
                Tanggal
              </label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(taskDate, "d MMMM yyyy", { locale: id })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={taskDate}
                    onSelect={(date) => {
                      setTaskDate(date || new Date());
                      setIsCalendarOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="priority" className="text-sm font-medium">
                  Prioritas
                </label>
                <Select value={taskPriority} onValueChange={setTaskPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih prioritas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">Tinggi</SelectItem>
                    <SelectItem value="Medium">Sedang</SelectItem>
                    <SelectItem value="Low">Rendah</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="status" className="text-sm font-medium">
                  Status
                </label>
                <Select value={taskStatus} onValueChange={setTaskStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Tertunda</SelectItem>
                    <SelectItem value="In Progress">Sedang Dikerjakan</SelectItem>
                    <SelectItem value="Completed">Selesai</SelectItem>
                    <SelectItem value="Cancelled">Dibatalkan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSaveTask} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Perbarui" : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog Konfirmasi Hapus */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Hapus</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Apakah Anda yakin ingin menghapus tugas ini?</p>
            <p className="text-sm text-gray-500 mt-2">
              Tindakan ini tidak dapat dibatalkan dan semua data tugas akan hilang.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}