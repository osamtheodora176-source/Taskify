import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2, Clock, X, CheckCircle2, LogOut, Layers, Search, Filter, User, Settings, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import Auth from './Auth';
import './index.css';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api/todos`;
const PROFILE_URL = `${BASE_URL}/api/auth/profile`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('dora_token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('dora_user') || 'null'));
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Form State (Task)
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [taskType, setTaskType] = useState('simple');
  const [dueTime, setDueTime] = useState('');

  // Form State (Profile)
  const [profileAvatar, setProfileAvatar] = useState('');
  const [profilePassword, setProfilePassword] = useState('');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterType, setFilterType] = useState('');

  // Notifications logic
  const [notifiedTasks, setNotifiedTasks] = useState(new Set());

  useEffect(() => {
    if (token) {
      fetchTasks();
    }
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (tasks.length === 0) return;
      const now = new Date().getTime();
      
      tasks.forEach(task => {
        if (task.status !== 'completed' && task.due_time && !notifiedTasks.has(task.id)) {
          const due = new Date(task.due_time).getTime();
          if (now >= due && now - due <= 60000) {
            let notificationBody = task.description || 'It is time to do this task!';
            let notificationTitle = 'Task Reminder: ' + task.title;
            
            if (task.task_type === 'birthday') {
              notificationTitle = '🎉 Happy Birthday!';
              notificationBody = `Don't forget to wish ${task.title} a happy birthday!`;
            } else if (task.task_type === 'meeting') {
              notificationTitle = '📅 Meeting Reminder: ' + task.title;
            }

            new Notification(notificationTitle, {
              body: notificationBody,
              icon: '/vite.svg'
            });
            setNotifiedTasks(prev => new Set(prev).add(task.id));
          }
        }
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [tasks, notifiedTasks]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(API_URL, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        toast.error('Session expired. Please log in again.');
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setTaskType('simple');
    setDueTime('');
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setTaskType(task.task_type || 'simple');
    setDueTime(task.due_time ? new Date(task.due_time).toISOString().slice(0, 16) : '');
    setIsModalOpen(true);
  };

  const saveTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const payload = { 
      title, 
      description, 
      priority, 
      taskType,
      dueTime: dueTime ? new Date(dueTime).toISOString() : null 
    };

    try {
      if (editingTaskId) {
        const { data } = await axios.put(`${API_URL}/${editingTaskId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setTasks(tasks.map(t => t.id === editingTaskId ? data : t));
        toast.success('Task updated successfully!');
      } else {
        const { data } = await axios.post(API_URL, payload, { headers: { Authorization: `Bearer ${token}` } });
        setTasks([data, ...tasks]);
        toast.success('Task created successfully!');
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error(editingTaskId ? 'Failed to update task' : 'Failed to create task');
    }
  };

  const deleteTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Task deleted');
    } catch (error) {
      toast.error('Failed to delete task');
      fetchTasks();
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // Optimistic Update
    const newStatus = destination.droppableId;
    setTasks(tasks.map(t => t.id === parseInt(draggableId) ? { ...t, status: newStatus } : t));

    try {
      await axios.put(`${API_URL}/${draggableId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (newStatus === 'completed') toast.success('Task completed! 🎉');
    } catch (error) {
      toast.error('Failed to move task');
      fetchTasks();
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await axios.put(PROFILE_URL, { password: profilePassword, avatar_url: profileAvatar }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('dora_token', data.token);
      localStorage.setItem('dora_user', JSON.stringify(data.user));
      toast.success('Profile updated successfully!');
      setIsProfileOpen(false);
      setProfilePassword('');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const handleLogin = (token, user) => {
    setToken(token);
    setUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('dora_token');
    localStorage.removeItem('dora_user');
    setToken(null);
    setUser(null);
    setTasks([]);
  };

  if (!token) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: '10px', background: '#333', color: '#fff' } }} />
        <Auth onLogin={handleLogin} />
      </>
    );
  }

  let filteredTasks = tasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || (t.description || '').toLowerCase().includes(searchQuery.toLowerCase()));
  if (filterPriority) filteredTasks = filteredTasks.filter(t => t.priority === filterPriority);
  if (filterType) filteredTasks = filteredTasks.filter(t => t.task_type === filterType);

  const todoTasks = filteredTasks.filter(t => t.status === 'pending');
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress');
  const doneTasks = filteredTasks.filter(t => t.status === 'completed');

  const SkeletonCard = () => (
    <div className="task-card skeleton-card">
      <div className="skeleton-bar" style={{ width: '60%', height: '1.2rem', marginBottom: '1rem' }}></div>
      <div className="skeleton-bar" style={{ width: '100%', height: '0.8rem', marginBottom: '0.5rem' }}></div>
      <div className="skeleton-bar" style={{ width: '80%', height: '0.8rem', marginBottom: '1rem' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div className="skeleton-bar" style={{ width: '30%', height: '0.8rem' }}></div>
        <div className="skeleton-bar" style={{ width: '20%', height: '0.8rem' }}></div>
      </div>
    </div>
  );

  const EmptyState = ({ icon: Icon, title, desc }) => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
      <div style={{ background: 'var(--bg-kanban)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
        <Icon size={24} color="var(--border-color)" style={{ color: 'var(--text-secondary)', opacity: 0.5 }} />
      </div>
      <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>{title}</h4>
      <p style={{ fontSize: '0.85rem' }}>{desc}</p>
    </motion.div>
  );

  return (
    <>
      <Toaster position="top-right" toastOptions={{ style: { borderRadius: '10px', background: '#333', color: '#fff' } }} />
      
      <header className="app-header">
        <div className="app-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={24} color="var(--accent-blue)" />
          Board
        </div>
        
        <div className="header-search">
          <Search size={18} color="var(--text-secondary)" />
          <input 
            type="text" 
            placeholder="Search tasks..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={18} /> <span className="hide-on-mobile">New Task</span>
          </button>
          
          <button className="action-btn" onClick={() => { setProfileAvatar(user.avatar_url || ''); setIsProfileOpen(true); }} title="Profile">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <User size={20} color="var(--text-secondary)" />
            )}
          </button>
          
          <button className="action-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} color="var(--text-secondary)" />
          </button>
        </div>
      </header>

      <div className="filters-bar" style={{ padding: '1rem 2rem 0', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="filter-item">
          <Filter size={14} color="var(--text-secondary)" />
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
            <option value="">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
        <div className="filter-item">
          <Layers size={14} color="var(--text-secondary)" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="simple">Simple</option>
            <option value="birthday">Birthday</option>
            <option value="meeting">Meeting</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      <div className="board-container">
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* To Do Column */}
          <div className="kanban-column">
            <div className="column-header todo">
              <span>To Do</span>
              <span className="column-badge">{todoTasks.length}</span>
            </div>
            <Droppable droppableId="pending">
              {(provided) => (
                <div className="column-body" ref={provided.innerRef} {...provided.droppableProps}>
                  {isLoading ? (
                    <><SkeletonCard /><SkeletonCard /></>
                  ) : (
                    <>
                      {todoTasks.map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ ...provided.draggableProps.style, marginBottom: '0.75rem', opacity: snapshot.isDragging ? 0.8 : 1 }}
                              className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div className={`priority-bar priority-${task.priority}`}></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 className="task-title" onClick={() => openEditModal(task)} style={{ cursor: 'pointer', flex: 1 }}>{task.title}</h3>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <span style={{ fontSize: '0.7rem', background: 'var(--bg-main)', padding: '0.1rem 0.4rem', borderRadius: '1rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                    {task.task_type}
                                  </span>
                                </div>
                              </div>
                              {task.description && <p className="task-desc">{task.description}</p>}
                              
                              <div className="task-footer">
                                <div className="date-stamp">
                                  <Clock size={12} />
                                  {task.due_time ? `Due: ${new Date(task.due_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : new Date(task.created_at).toLocaleDateString()}
                                </div>
                                <div className="task-actions">
                                  <button className="action-btn" onClick={() => openEditModal(task)} title="Edit Task">
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="action-btn delete" onClick={() => deleteTask(task.id)} title="Delete Task">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!isLoading && todoTasks.length === 0 && <EmptyState icon={Layers} title="No tasks yet" desc="Add a task to get started." />}
                    </>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* In Progress Column */}
          <div className="kanban-column">
            <div className="column-header progress">
              <span>In Progress</span>
              <span className="column-badge">{inProgressTasks.length}</span>
            </div>
            <Droppable droppableId="in_progress">
              {(provided) => (
                <div className="column-body" ref={provided.innerRef} {...provided.droppableProps}>
                  {isLoading ? (
                    <SkeletonCard />
                  ) : (
                    <>
                      {inProgressTasks.map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ ...provided.draggableProps.style, marginBottom: '0.75rem', opacity: snapshot.isDragging ? 0.8 : 1 }}
                              className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div className={`priority-bar priority-${task.priority}`}></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 className="task-title" onClick={() => openEditModal(task)} style={{ cursor: 'pointer', flex: 1 }}>{task.title}</h3>
                                <span style={{ fontSize: '0.7rem', background: 'var(--bg-main)', padding: '0.1rem 0.4rem', borderRadius: '1rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                  {task.task_type}
                                </span>
                              </div>
                              {task.description && <p className="task-desc">{task.description}</p>}
                              
                              <div className="task-footer">
                                <div className="date-stamp">
                                  <Clock size={12} />
                                  {task.due_time ? `Due: ${new Date(task.due_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : new Date(task.created_at).toLocaleDateString()}
                                </div>
                                <div className="task-actions">
                                  <button className="action-btn" onClick={() => openEditModal(task)} title="Edit Task">
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="action-btn delete" onClick={() => deleteTask(task.id)} title="Delete Task">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!isLoading && inProgressTasks.length === 0 && <EmptyState icon={Clock} title="Nothing in progress" desc="Move a task here when you start." />}
                    </>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* Done Column */}
          <div className="kanban-column">
            <div className="column-header done">
              <span>Done</span>
              <span className="column-badge">{doneTasks.length}</span>
            </div>
            <Droppable droppableId="completed">
              {(provided) => (
                <div className="column-body" ref={provided.innerRef} {...provided.droppableProps}>
                  {isLoading ? (
                    <SkeletonCard />
                  ) : (
                    <>
                      {doneTasks.map((task, index) => (
                        <Draggable key={task.id.toString()} draggableId={task.id.toString()} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              style={{ ...provided.draggableProps.style, marginBottom: '0.75rem', opacity: snapshot.isDragging ? 0.8 : 1 }}
                              className={`task-card done ${snapshot.isDragging ? 'dragging' : ''}`}
                            >
                              <div className={`priority-bar priority-${task.priority}`}></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h3 className="task-title" onClick={() => openEditModal(task)} style={{ cursor: 'pointer', flex: 1 }}>{task.title}</h3>
                                <span style={{ fontSize: '0.7rem', background: 'var(--bg-main)', padding: '0.1rem 0.4rem', borderRadius: '1rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                  {task.task_type}
                                </span>
                              </div>
                              {task.description && <p className="task-desc">{task.description}</p>}
                              
                              <div className="task-footer">
                                <div className="date-stamp">
                                  <CheckCircle2 size={12} color="var(--priority-low)" />
                                  {task.due_time ? `Due: ${new Date(task.due_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : new Date(task.created_at).toLocaleDateString()}
                                </div>
                                <div className="task-actions">
                                  <button className="action-btn" onClick={() => openEditModal(task)} title="Edit Task">
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="action-btn delete" onClick={() => deleteTask(task.id)} title="Delete Task">
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {!isLoading && doneTasks.length === 0 && <EmptyState icon={CheckCircle2} title="No completed tasks" desc="Finished tasks will appear here." />}
                    </>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </div>

      {/* Profile Modal */}
      <AnimatePresence>
        {isProfileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setIsProfileOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Profile Settings</h2>
                <button className="close-btn" onClick={() => setIsProfileOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={updateProfile}>
                <div className="form-group" style={{ textAlign: 'center', marginBottom: '2rem' }}>
                  <img src={profileAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user?.username} alt="Avatar Preview" style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)', marginBottom: '1rem' }} />
                  <label>Avatar URL</label>
                  <input type="text" className="form-control" value={profileAvatar} onChange={e => setProfileAvatar(e.target.value)} placeholder="https://..." />
                </div>
                <div className="form-group">
                  <label>New Password (leave blank to keep current)</label>
                  <input type="password" className="form-control" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setIsProfileOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Save Profile</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add/Edit Task Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setIsModalOpen(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{editingTaskId ? 'Edit Task' : 'Create New Task'}</h2>
                <button className="close-btn" onClick={() => setIsModalOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={saveTask}>
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" className="form-control" value={title} onChange={e => setTitle(e.target.value)} required placeholder="What needs to be done?" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Add some details..." rows="3" />
                </div>
                <div className="form-group" style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label>Priority</label>
                    <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Task Type</label>
                    <select className="form-control" value={taskType} onChange={e => setTaskType(e.target.value)}>
                      <option value="simple">Simple Task</option>
                      <option value="birthday">Birthday</option>
                      <option value="meeting">Meeting</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Due Time (Optional)</label>
                  <input type="datetime-local" className="form-control" value={dueTime} onChange={e => setDueTime(e.target.value)} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn-outline" onClick={() => setIsModalOpen(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingTaskId ? 'Save Changes' : 'Create Task'}</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
