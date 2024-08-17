import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, getDocs } from "firebase/firestore"; // Agregar onSnapshot y getDocs
import { auth } from "./firebase";
import Modal from 'react-modal';

Modal.setAppElement('#root'); // Necesario para accesibilidad

function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState(''); // Definir taskTitle y setTaskTitle
  const [taskDifficulty, setTaskDifficulty] = useState(''); // Definir taskDifficulty y setTaskDifficulty
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (querySnapshot) => {
      const tasksArray = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksArray);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Suponiendo que tienes una colección de usuarios en la base de datos
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersArray = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(usersArray);
    };

    fetchUsers();
  }, []);

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);

  const addTask = async () => { // Definir la función addTask
    if (!taskTitle || !taskDifficulty) {
      alert("Please fill out all required fields.");
      return;
    }

    await addDoc(collection(db, "tasks"), {
      title: taskTitle,
      difficulty: taskDifficulty,
      assignedTo: "", // Dejar en blanco o asignar más tarde
      assignedToName: "", // Dejar en blanco o asignar más tarde
      completed: false,
      createdAt: new Date(),
      createdBy: auth.currentUser.uid,
      createdByName: auth.currentUser.email // Guardar el email del creador
    });

    setTaskTitle('');
    setTaskDifficulty('');
    closeModal(); // Cerrar el modal después de agregar la tarea
  };

  const assignTaskToUser = async (taskId) => { // Definir la función assignTaskToUser
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      assignedTo: auth.currentUser.uid,
      assignedToName: auth.currentUser.email // O usa displayName si lo tienes disponible
    });
  };

  const markTaskAsCompleted = async (taskId, assignedTo) => { // Definir la función markTaskAsCompleted
    if (assignedTo !== auth.currentUser.uid) {
      alert("You can only complete tasks assigned to you.");
      return;
    }

    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      completed: true
    });
  };

  const reassignTasks = async () => {
    const unassignedTasks = tasks.filter(task => !task.assignedTo && !task.completed);
    
    // Obtener a los dos usuarios (aquí asumimos que hay exactamente dos usuarios)
    if (users.length !== 2) {
      alert("Debe haber exactamente dos usuarios para reasignar las tareas.");
      return;
    }

    let user1Tasks = [];
    let user2Tasks = [];

    let user1Difficulty = 0;
    let user2Difficulty = 0;

    // Asignar las tareas equitativamente según la dificultad
    for (const task of unassignedTasks) {
      if (user1Difficulty <= user2Difficulty) {
        user1Tasks.push(task);
        user1Difficulty += task.difficulty;
      } else {
        user2Tasks.push(task);
        user2Difficulty += task.difficulty;
      }
    }

    // Actualizar las tareas en Firestore
    const batchUpdate = async (userTasks, user) => {
      for (const task of userTasks) {
        const taskRef = doc(db, "tasks", task.id);
        await updateDoc(taskRef, {
          assignedTo: user.uid,
          assignedToName: user.email // O usa displayName si está disponible
        });
      }
    };

    await batchUpdate(user1Tasks, users[0]);
    await batchUpdate(user2Tasks, users[1]);

    alert("Tareas reasignadas equitativamente.");
  };

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
        <button onClick={reassignTasks} style={styles.reassignButton}>Reassign Tasks</button>
        <button onClick={openModal} style={styles.addButton}>+</button>
      </div>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            {task.title} (Difficulty: {task.difficulty}) - 
            {task.assignedTo 
              ? `Assigned to: ${task.assignedToName}` 
              : 'Not Assigned'} 
            {task.completed 
              ? ' - Completed' 
              : task.assignedTo === auth.currentUser.uid 
                ? <button onClick={() => markTaskAsCompleted(task.id, task.assignedTo)}>Mark as Completed</button>
                : <span> - Cannot complete, not assigned to you</span>}
            {!task.assignedTo && <button onClick={() => assignTaskToUser(task.id)}>Assign to Me</button>}
          </li>
        ))}
      </ul>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Add Task"
      >
        <h2>Add a New Task</h2>
        <form onSubmit={(e) => { e.preventDefault(); addTask(); }}>
          <div>
            <label>Task Title:</label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Task Difficulty:</label>
            <input
              type="number"
              value={taskDifficulty}
              onChange={(e) => setTaskDifficulty(e.target.value)}
              required
            />
          </div>
          <button type="submit">Add Task</button>
          <button type="button" onClick={closeModal} style={styles.closeButton}>Cancel</button>
        </form>
      </Modal>
    </div>
  );
}

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
  },
};

const styles = {
  reassignButton: {
    marginLeft: '10px',
    backgroundColor: '#28a745',
    color: 'white',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  addButton: {
    fontSize: '24px',
    padding: '10px 20px',
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    backgroundColor: '#007bff',
    color: 'white',
  },
  closeButton: {
    marginLeft: '10px',
    backgroundColor: '#ff4d4d',
    color: 'white',
    padding: '5px 10px',
    border: 'none',
    cursor: 'pointer',
  }
};

export default TaskManager;
