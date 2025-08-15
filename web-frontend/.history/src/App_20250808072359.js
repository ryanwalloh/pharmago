import React, { useEffect, useState } from 'react';
import api from './services/api';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('test/').then(res => {
      setMessage(res.data.message);
    });
  }, []);

  return <h1>{message}</h1>;
}

export default App;
