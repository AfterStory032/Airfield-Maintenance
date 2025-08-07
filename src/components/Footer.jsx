import React from 'react';
import { useDarkMode } from '../context/DarkModeContext';

const Footer = () => {
  const { darkMode } = useDarkMode();
  
  return (
    <footer className={`py-4 px-6 ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-white text-gray-600'} border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
      <div className="flex flex-col items-center justify-center text-center">
        <p className="text-sm">
          Developed by Mohamed Mahdi (101570)
        </p>
        <p className="text-sm mt-1">
          For more information Contact mohamed.keshtkar@bac.bh
        </p>
      </div>
    </footer>
  );
};

export default Footer;