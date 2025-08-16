import React, { useEffect, useState } from 'react';
import api from './services/api';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">
          First Test
        </h1>
        <p className="text-gray-600 text-lg">
          Tailwind Test
        </p>
        <button className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
          Button Test
        </button>
      </div>
    </div>
  );
}

export default App;
