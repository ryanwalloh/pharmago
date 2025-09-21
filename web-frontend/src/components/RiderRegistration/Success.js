import React from "react";

const Success = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-green-600 mb-4">
          Registration Successful!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Your rider registration has been submitted for verification. You will
          be notified once your account is approved.
        </p>
        <button
          onClick={() => (window.location.href = "/")}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
        >
          Return to Home
        </button>
      </div>
    </div>
  );
};

export default Success;
