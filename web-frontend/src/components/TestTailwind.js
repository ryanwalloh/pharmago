import React from 'react';

const TestTailwind = () => {
  return (
    <div className="p-8 bg-blue-500 text-white text-center">
      <h1 className="text-4xl font-bold mb-4">Tailwind Test</h1>
      <p className="text-xl">If you see this styled, Tailwind is working!</p>
      <div className="mt-4 p-4 bg-white text-blue-500 rounded-lg shadow-lg">
        <p className="font-semibold">This should have a white background with blue text</p>
      </div>
    </div>
  );
};

export default TestTailwind;
