// src/Banner.js

import React from 'react';
import './Banner.css';  // Importa los estilos específicos para el banner

const Banner = ({ imageUrl }) => {
  return (
    <div className="banner">
      <img src="./banner.jpg" alt="Banner" />
    </div>
  );
};

export default Banner;
