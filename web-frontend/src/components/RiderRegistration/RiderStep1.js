import React, { useState, useEffect } from "react";
import { useRegistration } from "../../contexts/RiderRegistrationContext";
import MinimalHeader from "../common/MinimalHeader";
import LeftImage from "../common/LeftImage";
import { useNavigate } from "react-router-dom";

const RiderStep1 = ({}) => {
  const navigate = useNavigate();

  const {
    userAccount,
    updateUserAccount,
    logRegistrationData,
    getAllRegistrationData,
  } = useRegistration();

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const [formData, setFormData] = useState({
    firstName: userAccount.first_name || "",
    middleName: userAccount.middle_name || "",
    lastName: userAccount.last_name || "",
    email: userAccount.email || "",
    mobileNumber: userAccount.phone || "",
  });

  // Update form data when context data changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      firstName: userAccount.first_name || prev.firstName,
      middleName: userAccount.middle_name || prev.middleName,
      lastName: userAccount.last_name || prev.lastName,
      email: userAccount.email || prev.email,
      mobileNumber: userAccount.phone || prev.mobileNumber,
    }));
  }, [userAccount]);

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Update context with form data
    updateUserAccount({
      first_name: formData.firstName,
      middle_name: formData.middleName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.mobileNumber,
    });

    console.log("=== RIDER REGISTRATION STEP 1 SUBMITTED ===");
    console.log("Form Data:", formData);
    console.log("Updated User Account:", {
      first_name: formData.firstName,
      middle_name: formData.middleName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.mobileNumber,
    });
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("===============================================");

    logRegistrationData();

    // Navigate to next step
    navigate("/rider-registration-2");
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log("=== PHARMACY REGISTRATION STEP 1 MOUNTED ===");
    console.log("Initial User Account Data:", userAccount);
    console.log("Current Form Data:", formData);
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("=============================================");
    logRegistrationData();
  }, [logRegistrationData, userAccount, formData]);

  // Form validation
  const isFormValid = () => {
    return (
      formData.firstName.trim() !== "" &&
      formData.middleName.trim() !== "" &&
      formData.lastName.trim() !== "" &&
      formData.email.trim() !== "" &&
      formData.mobileNumber.trim()
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case "firstName":
        return formData.firstName.trim() !== "";
      case "middleName":
        return formData.middleName.trim() !== "";
      case "lastName":
        return formData.lastName.trim() !== "";
      case "email":
        return formData.email.trim() !== "";
      case "mobileNumber":
        return formData.mobileNumber.trim() !== "";
      default:
        return true;
    }
  };

  return (
    <div className="h-screen overflow-hidden font-roboto">
      {/* Header - Simplified version with only logo */}
      <MinimalHeader />

      {/* Main Container - Grid Layout */}
      <div className="grid grid-cols-2 h-[calc(100vh-88px)]">
        {/* Left Image Container */}
        <LeftImage src="/images/regbg1.png" alt="Pharmacy Staff" />

        {/* Right Form Container & Steps */}
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
                  onSubmit={handleSubmit}
                >
                  {/* Rider First Name */}
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

                  {/* Rider Middle Name */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="middleName"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("middleName")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Middle Name"
                      required
                    />
                    <label
                      htmlFor="middleName"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("middleName")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Middle Name *
                    </label>
                  </div>

                  {/* Rider Last Name */}
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

                  {/* Rider Mobile Number */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("email")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Email"
                      required
                    />
                    <label
                      htmlFor="email"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("email")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Personal Email *
                    </label>
                  </div>

                  {/* Rider Mobile Number */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("mobileNumber")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Personal Email"
                      required
                    />
                    <label
                      htmlFor="mobileNumber"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("mobileNumber")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Mobile Number *
                    </label>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
                    <div className="w-[20%] h-1.5 bg-[#004445]"></div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate("/")}
                      className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <p className="text-gray-500">4 step(s) to complete</p>
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
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiderStep1;
