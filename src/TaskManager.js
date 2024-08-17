import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, getDocs, getDoc } from "firebase/firestore";
import { auth } from "./firebase";
import Modal from 'react-modal';

Modal.setAppElement('#root'); // Necesario para accesibilidad

function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDifficulty, setTaskDifficulty] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [difficultyPoints, setDifficultyPoints] = useState({});
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "tasks"), (querySnapshot) => {
      const tasksArray = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(tasksArray);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersArray = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      setUsers(usersArray);
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const points = users.reduce((acc, user) => {
      acc[user.uid] = tasks
        .filter(task => task.assignedTo === user.uid)
        .reduce((sum, task) => sum + parseInt(task.difficulty, 10), 0);
      return acc;
    }, {});
    setDifficultyPoints(points);

    const progressData = users.reduce((acc, user) => {
      const userTasks = tasks.filter(task => task.assignedTo === user.uid);
      const completedTasks = userTasks.filter(task => task.completed).length;
      const progress = userTasks.length > 0 ? (completedTasks / userTasks.length) * 100 : 0;
      acc[user.uid] = progress;
      return acc;
    }, {});
    setProgress(progressData);
  }, [tasks, users]);

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => {
    setModalIsOpen(false);
    setTaskTitle('');
    setTaskDifficulty('');
    setAssignedUser('');
  };

  const addTask = async () => {
    if (!taskTitle || !taskDifficulty || !assignedUser) {
      alert("Please fill out all required fields.");
      return;
    }

    const assignedUserData = users.find(user => user.uid === assignedUser);

    await addDoc(collection(db, "tasks"), {
      title: taskTitle,
      difficulty: taskDifficulty,
      assignedTo: assignedUserData.uid,
      assignedToName: assignedUserData.name,
      completed: false,
      createdAt: new Date(),
      createdBy: auth.currentUser.uid,
      createdByName: auth.currentUser.email
    });

    closeModal();
  };

  const assignTaskToUser = async (taskId, userId, userName) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      assignedTo: userId,
      assignedToName: userName
    });
  };

  const markTaskAsCompleted = async (taskId, completed, difficulty, assignedTo) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { completed: completed });

    if (completed) {
      // Incrementar puntos totales del usuario
      const userRef = doc(db, "users", assignedTo);
      const userDoc = await getDoc(userRef);
      const currentPoints = userDoc.data().totalPoints || 0;
      await updateDoc(userRef, {
        totalPoints: currentPoints + parseInt(difficulty, 10)
      });
    }
  };

  const reassignTasks = async () => {
    if (users.length < 2) {
      alert("Debe haber al menos dos usuarios para reasignar las tareas.");
      return;
    }

    let user1Tasks = [];
    let user2Tasks = [];
    let user1Difficulty = 0;
    let user2Difficulty = 0;

    // Reiniciar todas las tareas a "not completed"
    for (const task of tasks) {
      await updateDoc(doc(db, "tasks", task.id), {
        completed: false,
        assignedTo: "", // Opcional: Reasignar desde cero
        assignedToName: ""
      });
    }

    // Asignar tareas de nuevo de manera equitativa
    for (const task of tasks) {
      if (user1Difficulty <= user2Difficulty) {
        user1Tasks.push(task);
        user1Difficulty += parseInt(task.difficulty, 10);
      } else {
        user2Tasks.push(task);
        user2Difficulty += parseInt(task.difficulty, 10);
      }
    }

    const batchUpdate = async (userTasks, user) => {
      for (const task of userTasks) {
        const taskRef = doc(db, "tasks", task.id);
        await updateDoc(taskRef, {
          assignedTo: user.uid,
          assignedToName: user.name
        });
      }
    };

    await batchUpdate(user1Tasks, users[0]);
    await batchUpdate(user2Tasks, users[1]);

    alert("Tareas reasignadas equitativamente y restablecidas a 'not completed'.");
  };

  const filteredTasks = tasks.filter(task => {
    return !showOnlyMyTasks || task.assignedTo === auth.currentUser.uid;
  });

  return (
    <div>
      <h2>Task Manager</h2>
      <div>
        <h3>Puntos de dificultad y progreso</h3>
        <ul>
          {users.map(user => (
            <li key={user.uid}>
              {user.name}: {difficultyPoints[user.uid] || 0} puntos en tareas actuales
              <div>
                <p>Total de puntos acumulados: {user.totalPoints || 0}</p>
                <div style={styles.progressContainer}>
                  <div style={{ ...styles.progressBar, width: `${progress[user.uid] || 0}%` }}></div>
                </div>
                <p>{Math.round(progress[user.uid] || 0)}% completado</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
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
        {filteredTasks.map(task => (
          <li key={task.id}>
            {task.title} (Difficulty: {task.difficulty}) - 
            {task.assignedTo 
              ? (
                <>
                  Assigned to: 
                  <select
                    value={task.assignedTo}
                    onChange={(e) => {
                      const selectedUser = users.find(user => user.uid === e.target.value);
                      assignTaskToUser(task.id, selectedUser.uid, selectedUser.name);
                    }}
                  >
                    {users.map(user => (
                      <option key={user.uid} value={user.uid}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </>
              )
              : 'Not Assigned'}
            {task.completed 
              ? (
                <>
                  - Completed 
                  <button onClick={() => markTaskAsCompleted(task.id, false, task.difficulty, task.assignedTo)}>Undo</button>
                </>
              )
              : task.assignedTo === auth.currentUser.uid 
                ? <button onClick={() => markTaskAsCompleted(task.id, true, task.difficulty, task.assignedTo)}>Mark as Completed</button>
                : <span> - Cannot complete, not assigned to you</span>}
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
          <div>
            <label>Assign to:</label>
            <select
              value={assignedUser}
              onChange={(e) => setAssignedUser(e.target.value)}
              required
            >
              <option value="">Select User</option>
              {users.map(user => (
                <option key={user.uid} value={user.uid}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit">Add Task</button>
          <button type="button" onClick={closeModal} style={styles.closeButton}>Cancel</button>
        </form>
      </Modal>
    </div>
  );
}

const styles = {
  progressContainer: {
    width: '100%',
    backgroundColor: '#e0e0df',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  progressBar: {
    height: '20px',
    backgroundColor: '#76c7c0',
  },
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

export default TaskManager;
