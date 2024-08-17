import React, { useState } from 'react';
import Modal from 'react-modal';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth } from './firebase';

Modal.setAppElement('#root'); // Esto es necesario para accesibilidad

function TaskFormModal() {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState(1);
  const [assignedTo, setAssignedTo] = useState('');
  const [completed, setCompleted] = useState(false);

  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title || !description || !assignedTo) {
      alert("Please fill out all required fields.");
      return;
    }

    try {
      await addDoc(collection(db, "tasks"), {
        title: title,
        description: description,
        difficulty: difficulty,
        assignedTo: assignedTo,
        completed: completed,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid,
      });

      // Reset form fields after submission
      setTitle('');
      setDescription('');
      setDifficulty(1);
      setAssignedTo('');
      setCompleted(false);
      closeModal(); // Close modal after submission
    } catch (error) {
      console.error("Error adding task: ", error);
    }
  };

  return (
    <div>
      <button onClick={openModal} style={styles.addButton}>+</button>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        contentLabel="Task Form"
        style={customStyles}
      >
        <h2>Create a New Task</h2>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Title:</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Description:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>
          <div>
            <label>Difficulty:</label>
            <input
              type="number"
              value={difficulty}
              onChange={(e) => setDifficulty(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label>Assign to (User ID):</label>
            <input
              type="text"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              required
            />
          </div>
          <div>
            <label>
              Completed:
              <input
                type="checkbox"
                checked={completed}
                onChange={(e) => setCompleted(e.target.checked)}
              />
            </label>
          </div>
          <button type="submit">Add Task</button>
          <button onClick={closeModal} style={styles.closeButton}>Cancel</button>
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

export default TaskFormModal;
