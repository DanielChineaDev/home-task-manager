import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, query, where, updateDoc, doc } from "firebase/firestore";
import { auth } from "./firebase";

function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDifficulty, setTaskDifficulty] = useState('');

  useEffect(() => {
    const q = query(collection(db, "tasks"), where("assignedTo", "==", auth.currentUser.uid));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tasksArray = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksArray);
    });

    return () => unsubscribe();
  }, []);

  const addTask = async () => {
    await addDoc(collection(db, "tasks"), {
      title: taskTitle,
      difficulty: taskDifficulty,
      assignedTo: auth.currentUser.uid,
      completed: false
    });

    setTaskTitle('');
    setTaskDifficulty('');
  };

  const markTaskAsCompleted = async (taskId) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      completed: true
    });
  };

  return (
    <div>
      <h2>My Tasks</h2>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.title} (Difficulty: {task.difficulty})
            {task.completed ? ' - Completed' : <button onClick={() => markTaskAsCompleted(task.id)}>Mark as Completed</button>}
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
