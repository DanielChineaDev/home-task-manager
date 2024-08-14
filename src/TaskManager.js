import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { auth } from "./firebase";

function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDifficulty, setTaskDifficulty] = useState('');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (querySnapshot) => {
      const tasksArray = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksArray);
    });

    return () => unsubscribe();
  }, []);

  const addTask = async () => {
    await addDoc(collection(db, "tasks"), {
      title: taskTitle,
      difficulty: taskDifficulty,
      assignedTo: "", // Dejar en blanco o asignar más tarde
      completed: false
    });

    setTaskTitle('');
    setTaskDifficulty('');
  };

  const assignTaskToUser = async (taskId) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      assignedTo: auth.currentUser.uid
    });
  };

  const markTaskAsCompleted = async (taskId) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      completed: true
    });
  };

  const filteredTasks = showOnlyMyTasks
    ? tasks.filter(task => task.assignedTo === auth.currentUser.uid)
    : tasks;

  return (
    <div>
      <h2>Tasks</h2>
      <div>
        <label>
          <input
            type="checkbox"
            checked={showOnlyMyTasks}
            onChange={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
          />
          Show Only My Tasks
        </label>
      </div>
      <ul>
        {filteredTasks.map(task => (
          <li key={task.id}>
            {task.title} (Difficulty: {task.difficulty}) - 
            {task.assignedTo === auth.currentUser.uid ? ' Assigned to You' : ' Not Assigned'} 
            {task.completed ? ' - Completed' : <button onClick={() => markTaskAsCompleted(task.id)}>Mark as Completed</button>}
            {!task.assignedTo && <button onClick={() => assignTaskToUser(task.id)}>Assign to Me</button>}
          </li>
        ))}
      </ul>
      <input
        type="text"
        value={taskTitle}
        onChange={(e) => setTaskTitle(e.target.value)}
        placeholder="Task Title"
      />
      <input
        type="number"
        value={taskDifficulty}
        onChange={(e) => setTaskDifficulty(e.target.value)}
        placeholder="Task Difficulty"
      />
      <button onClick={addTask}>Add Task</button>
    </div>
  );
}

export default TaskManager;
