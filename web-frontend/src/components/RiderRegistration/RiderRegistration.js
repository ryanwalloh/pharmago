import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRegistration } from "../../contexts/RiderRegistrationContext";

const RiderRegistration = () => {
  const navigate = useNavigate();

  const { userAccount } = useRegistration();

  return (
    <div className="h-screen overflow-hidden font-roboto">
      {/* Header - Simplified version with only logo */}
      <nav className="bg-white shadow-lg border-b border-[#D5E8D4]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="flex items-center space-x-3">
                  <img
                    src="/assets/logosvgdark.svg"
                    alt="PharmaGo Logo"
                    className="h-10 w-auto"
                  />
                </div>
              </div>
            </div>
            {/* Empty div to maintain spacing - no buttons on right */}
            <div></div>
          </div>
        </div>
      </nav>

      {/* Main Container - Grid Layout */}
      <div className="grid grid-cols-2 h-[calc(100vh-88px)]">
        {/* Left Image Container */}
        <div className="relative overflow-hidden">
          <div className="w-full h-full">
            <img
              src="/images/regbg1.png"
              alt="Pharmacy Staff"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Right Form Container */}
      <div className="flex flex-col justify-start items-center h-full text-center relative overflow-y-auto pb-16">
        <div className="flex justify-center relative top-6 pt-6">
          <div className="flex flex-col absolute w-[22vw] justify-start items-start text-[#2c2c2c]">
            {/* Header */}
            <h1 className="text-3xl font-bold mb-6 leading-10 flex text-left justify-left text-[#2c2c2c]">
              Tell us about yourself
            </h1>
            <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
              This information will be shown on the app so that customers can
              search and contact you in case they have any questions.
            </p>

            {/* Form */}
            <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
              <form
                className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]"
                onSubmit={null}
              >
                {/* Rider Name */}
                <div className="relative my-2.5 z-10">
                  <input
                    type="text"
                    id="pharmacyName"
                    name="pharmacyName"
                    value={null}
                    onChange={null}
                    className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                      isFieldValid("riderName")
                        ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                        : "border-red-300 focus:border-red-500 focus:ring-red-500"
                    }`}
                    placeholder="Your Rider Name"
                    required
                  />
                  <label
                    htmlFor="riderName"
                    className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                      isFieldValid("riderName")
                        ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                        : "text-red-500 peer-focus:text-red-500"
                    }`}
                  >
                    Your Rider Name *
                  </label>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      <div>Rider Registration</div>
    </div>
  );
};

export default RiderRegistration;
