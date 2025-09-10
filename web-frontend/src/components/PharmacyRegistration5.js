import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRegistration } from "../contexts/RegistrationContext";

const PharmacyRegistration5 = () => {
  const navigate = useNavigate();
  const {
    userAccount,
    updateUserAccount,
    logRegistrationData,
    getAllRegistrationData,
  } = useRegistration();

  // Form state - pre-populate with data from previous steps
  const [formData, setFormData] = useState({
    firstName: userAccount.first_name || "",
    middleName: userAccount.middle_name || "",
    lastName: userAccount.last_name || "",
    dateOfBirth: userAccount.date_of_birth || "",
    gender: userAccount.gender || "",
  });

  // Update form data when context data changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      firstName: userAccount.first_name || prev.firstName,
      middleName: userAccount.middle_name || prev.middleName,
      lastName: userAccount.last_name || prev.lastName,
      dateOfBirth: userAccount.date_of_birth || prev.dateOfBirth,
      gender: userAccount.gender || prev.gender,
    }));
  }, [userAccount]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Update context with owner information
    updateUserAccount({
      first_name: formData.firstName,
      middle_name: formData.middleName,
      last_name: formData.lastName,
      date_of_birth: formData.dateOfBirth,
      gender: formData.gender,
    });

    console.log("=== PHARMACY REGISTRATION STEP 5 SUBMITTED ===");
    console.log("Form Data:", formData);
    console.log("Updated User Account:", {
      first_name: formData.firstName,
      middle_name: formData.middleName,
      last_name: formData.lastName,
      date_of_birth: formData.dateOfBirth,
      gender: formData.gender,
    });
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("===============================================");

    logRegistrationData();

    // Navigate to submission step
    navigate("/pharmacy-registration-submission");
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log("=== PHARMACY REGISTRATION STEP 5 MOUNTED ===");
    console.log("Initial User Account Data:", userAccount);
    console.log("Current Form Data:", formData);
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("=============================================");
    logRegistrationData();
  }, [logRegistrationData, userAccount, formData, getAllRegistrationData]);

  // Form validation
  const isFormValid = () => {
    return (
      formData.firstName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.dateOfBirth !== "" &&
      formData.gender !== ""
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case "firstName":
        return formData.firstName.trim() !== "";
      case "lastName":
        return formData.lastName.trim() !== "";
      case "dateOfBirth":
        return formData.dateOfBirth !== "";
      case "gender":
        return formData.gender !== "";
      default:
        return true;
    }
  };

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
              src="/images/pharmareg5.png"
              alt="Owner Information"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Right Form Container */}
        <div className="flex flex-col justify-start items-center h-full text-center relative overflow-y-auto pb-16">
          <div className="flex justify-center relative top-6 pt-6">
            <div className="flex flex-col absolute w-[25vw] justify-start items-start text-[#2c2c2c] max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Header */}
              <h1 className="text-3xl font-bold mb-6 leading-10 flex text-left justify-left text-[#2c2c2c]">
                Tell us about the pharmacy owner
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                We need some additional information about the pharmacy owner for
                verification purposes.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form
                  className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c] space-y-4"
                  onSubmit={handleSubmit}
                >
                  {/* First Name */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("firstName")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="First Name"
                      required
                    />
                    <label
                      htmlFor="firstName"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("firstName")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      First Name *
                    </label>
                  </div>

                  {/* Middle Name */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="peer w-full px-4 py-3 border-2 border-[#D5E8D4] rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:border-[#6BBF9A] focus:ring-2 focus:ring-[#6BBF9A] focus:ring-opacity-20 transition-all duration-200"
                      placeholder="Middle Name"
                    />
                    <label
                      htmlFor="middleName"
                      className="absolute left-4 -top-2.5 bg-white px-2 text-sm text-[#4DAF7C] transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm peer-focus:text-[#6BBF9A]"
                    >
                      Middle Name
                    </label>
                  </div>

                  {/* Last Name */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("lastName")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Last Name"
                      required
                    />
                    <label
                      htmlFor="lastName"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("lastName")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Last Name *
                    </label>
                  </div>

                  {/* Date of Birth */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("dateOfBirth")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      required
                    />
                    <label
                      htmlFor="dateOfBirth"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("dateOfBirth")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Date of Birth *
                    </label>
                  </div>

                  {/* Gender */}
                  <div className="relative my-2.5 z-10">
                    <div
                      className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                        isFieldValid("gender")
                          ? "border-[#D5E8D4]"
                          : "border-red-300"
                      }`}
                    >
                      <label
                        className={`block text-sm mb-3 font-medium ${
                          isFieldValid("gender")
                            ? "text-[#4DAF7C]"
                            : "text-red-500"
                        }`}
                      >
                        Gender *
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={formData.gender === "male"}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-[#6BBF9A] border-[#D5E8D4] focus:ring-[#6BBF9A] focus:ring-2"
                          />
                          <span className="ml-2 text-gray-700">Male</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={formData.gender === "female"}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-[#6BBF9A] border-[#D5E8D4] focus:ring-[#6BBF9A] focus:ring-2"
                          />
                          <span className="ml-2 text-gray-700">Female</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="gender"
                            value="other"
                            checked={formData.gender === "other"}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-[#6BBF9A] border-[#D5E8D4] focus:ring-[#6BBF9A] focus:ring-2"
                          />
                          <span className="ml-2 text-gray-700">Other</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[83%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button
          type="button"
          onClick={() => navigate("/pharmacy-registration-4")}
          className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <p className="text-gray-500">2 step(s) to complete</p>
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={!isFormValid()}
          className={`text-base border-none py-1.5 px-5 font-bold rounded transition-colors ${
            isFormValid()
              ? "bg-[#2c786c] text-white hover:bg-[#004445]"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default PharmacyRegistration5;
