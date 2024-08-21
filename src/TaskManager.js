import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, onSnapshot, updateDoc, doc, getDocs, getDoc } from "firebase/firestore";
import { auth } from "./firebase";
import Modal from 'react-modal';
import './TaskManager.css';  // Importa el archivo CSS principal

Modal.setAppElement('#root'); // Necesario para accesibilidad

function TaskManager() {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDifficulty, setTaskDifficulty] = useState('');
  const [assignedUser, setAssignedUser] = useState('');
  const [taskUrl, setTaskUrl] = useState('');
  const [taskImage, setTaskImage] = useState('');
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [difficultyPoints, setDifficultyPoints] = useState({});
  const [progress, setProgress] = useState({});
  const [sortOption, setSortOption] = useState('difficulty');
  const [errorMessage, setErrorMessage] = useState(''); // Estado para mostrar mensajes de error

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
    setTaskUrl('');
    setTaskImage('');
  };

  const addTask = async () => {
    if (!taskTitle || !taskDifficulty || !assignedUser || !taskUrl || !taskImage) {
      alert("Please fill out all required fields.");
      return;
    }

    const assignedUserData = users.find(user => user.uid === assignedUser);

    await addDoc(collection(db, "tasks"), {
      title: taskTitle,
      difficulty: taskDifficulty,
      assignedTo: assignedUserData.uid,
      assignedToName: assignedUserData.name,
      assignedToPhoto: assignedUserData.photoURL,
      url: taskUrl,
      imageUrl: taskImage,
      completed: false,
      createdAt: new Date(),
      createdBy: auth.currentUser.uid,
      createdByName: auth.currentUser.email
    });

    closeModal();
  };

  const assignTaskToUser = async (taskId, userId, userName, userPhoto) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, {
      assignedTo: userId,
      assignedToName: userName,
      assignedToPhoto: userPhoto
    });
  };

  const handleTaskClick = async (task) => {
    if (task.assignedTo === auth.currentUser.uid) {
      await markTaskAsCompleted(task.id, !task.completed, task.difficulty, task.assignedTo);
    } else {
      setErrorMessage('No puede completar una tarea que no está asignada a usted.');
      setTimeout(() => setErrorMessage(''), 3000); // Oculta el mensaje de error después de 3 segundos
    }
  };

  const markTaskAsCompleted = async (taskId, completed, difficulty, assignedTo) => {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, { completed: completed });

    const userRef = doc(db, "users", assignedTo);
    const userDoc = await getDoc(userRef);
    const currentPoints = userDoc.data().totalPoints || 0;

    if (completed) {
      await updateDoc(userRef, {
        totalPoints: currentPoints + parseInt(difficulty, 10)
      });
    } else {
      await updateDoc(userRef, {
        totalPoints: currentPoints - parseInt(difficulty, 10)
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

    for (const task of tasks) {
      await updateDoc(doc(db, "tasks", task.id), {
        completed: false,
        assignedTo: "", 
        assignedToName: "",
        assignedToPhoto: ""
      });
    }

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
          assignedToName: user.name,
          assignedToPhoto: user.photoURL
        });
      }
    };

    await batchUpdate(user1Tasks, users[0]);
    await batchUpdate(user2Tasks, users[1]);

    alert("Tareas reasignadas equitativamente y restablecidas a 'not completed'.");
  };

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
  };

  const getDifficultyClass = (difficulty) => {
    switch (difficulty) {
      case '3':
        return 'difficulty-gold';
      case '2':
        return 'difficulty-silver';
      case '1':
        return 'difficulty-bronze';
      default:
        return '';
    }
  };

  const sortedTasks = tasks.slice().sort((a, b) => {
    if (sortOption === 'difficulty') {
      return b.difficulty - a.difficulty;
    } else if (sortOption === 'alphabetical') {
      return a.title.localeCompare(b.title);
    }
    return 0;
  });

  const filteredTasks = sortedTasks.filter(task => {
    return !showOnlyMyTasks || task.assignedTo === auth.currentUser.uid;
  });

  return (
    <div>
      <div className="container">
        <h2 className="title">Task Manager</h2>
        <div className="section">
          <h3 className="subtitle">Puntos de dificultad y progreso</h3>
          <ul className="list">
            {users.map(user => (
              <li key={user.uid} className="listItem">
                {user.name}: {difficultyPoints[user.uid] || 0} puntos en tareas actuales
                <div className="progressSection">
                  <p>Total de puntos acumulados: {user.totalPoints || 0}</p>
                  <div className="progressContainer">
                    <div className="progressBar" style={{ width: `${progress[user.uid] || 0}%` }}></div>
                  </div>
                  <p>{Math.round(progress[user.uid] || 0)}% completado</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="section">
          <h3 className="subtitle">Marcador de puntos totales acumulados</h3>
          <ul className="scoreboard">
            {users.map(user => (
              <li key={user.uid} className="scoreboardItem">
                <strong>{user.name}:</strong> {user.totalPoints || 0} puntos totales
              </li>
            ))}
          </ul>
        </div>
        <div className="section">
          <label className="label">
            <input
              type="checkbox"
              checked={showOnlyMyTasks}
              onChange={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
              className="checkbox"
            />
            Show Only My Tasks
          </label>
          <div className="sortSection">
            <label className="label">Ordenar por:</label>
            <select value={sortOption} onChange={handleSortChange} className="sortSelect">
              <option value="difficulty">Dificultad</option>
              <option value="alphabetical">Alfabéticamente</option>
            </select>
          </div>
          <div className="buttonRow">
            <button onClick={reassignTasks} className="squareButton reassignButton">
              Reasignar tareas
            </button>
            <button onClick={openModal} className="squareButton addButton">
              Añadir
            </button>
          </div>
        </div>
        {errorMessage && (
          <div className="errorMessage">
          <span role="text" aria-label="error" >{errorMessage}</span> 
        </div>
        )}
        <div className="cardGrid">
          {filteredTasks.map(task => (
            <div
              key={task.id}
              className={`taskCard ${getDifficultyClass(task.difficulty)} ${task.completed ? 'completed' : 'inProgress'} ${task.assignedTo !== auth.currentUser.uid ? 'notAssigned' : ''}`}
              style={{ backgroundImage: `url(${task.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundBlendMode: 'overlay' }}
              onClick={() => handleTaskClick(task)}
            >
              <div className="taskHeader">
                <span className={`taskDifficulty ${getDifficultyClass(task.difficulty)}`}>
                  <span className="points">{task.difficulty}</span> pts
                </span>
                {task.assignedTo && (
                  <div className="userInfo">
                    <img src={task.assignedToPhoto} alt={task.assignedToName} className="userPhoto" />
                    <select
                      className="userSelect"
                      value={task.assignedTo}
                      onChange={(e) => {
                        const selectedUser = users.find(user => user.uid === e.target.value);
                        assignTaskToUser(task.id, selectedUser.uid, selectedUser.name, selectedUser.photoURL);
                      }}
                      onClick={(e) => e.stopPropagation()} // Evitar que se complete la tarea al cambiar el usuario
                    >
                      {users.map(user => (
                        <option key={user.uid} value={user.uid}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <h3 className="taskTitle">{task.title}</h3>
              {task.completed && <div className="taskCompletedLabel">Completada</div>}
              {!task.completed && task.assignedTo === auth.currentUser.uid && (
                <div className="taskInProgressLabel">Tarea en proceso</div>
              )}
              {task.assignedTo !== auth.currentUser.uid && !task.completed && (
                <div className="taskNotAssignedLabel">No asignada a usted</div>
              )}
            </div>
          ))}
        </div>

        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customStyles}
          contentLabel="Add Task"
        >
          <h2 className="modalTitle">Add a New Task</h2>
          <form onSubmit={(e) => { e.preventDefault(); addTask(); }} className="form">
            <div className="formGroup">
              <label className="label">Task Title:</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
                className="input"
              />
            </div>
            <div className="formGroup">
              <label className="label">Task Difficulty:</label>
              <input
                type="number"
                value={taskDifficulty}
                onChange={(e) => setTaskDifficulty(e.target.value)}
                required
                className="input"
              />
            </div>
            <div className="formGroup">
              <label className="label">Assign to:</label>
              <select
                value={assignedUser}
                onChange={(e) => setAssignedUser(e.target.value)}
                required
                className="select"
              >
                <option value="">Select User</option>
                {users.map(user => (
                  <option key={user.uid} value={user.uid}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="formGroup">
              <label className="label">URL:</label>
              <input
                type="url"
                value={taskUrl}
                onChange={(e) => setTaskUrl(e.target.value)}
                placeholder="https://example.com"
                className="input"
              />
            </div>
            <div className="formGroup">
              <label className="label">Image URL:</label>
              <input
                type="url"
                value={taskImage}
                onChange={(e) => setTaskImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="input"
              />
            </div>
            <button type="submit" className="submitButton">Add Task</button>
            <button type="button" onClick={closeModal} className="closeButton">Cancel</button>
          </form>
        </Modal>

        {/* Footer */}
        <footer className="footer">
          Made with <span role="img" aria-label="heart">❤️</span>
        </footer>
      </div>
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
    width: '90%',
    maxWidth: '500px',
  },
};

export default TaskManager;
