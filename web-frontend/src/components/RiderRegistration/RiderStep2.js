import React, { useState, useEffect } from "react";
import { useRegistration } from "../../contexts/RiderRegistrationContext";
import MinimalHeader from "../common/MinimalHeader";
import LeftImage from "../common/LeftImage";
import { useNavigate } from "react-router-dom";

const RiderStep2 = ({}) => {
  const navigate = useNavigate();

  const {
    vehicleInfo,
    updateVehicleInfo,
    logRegistrationData,
    getAllRegistrationData,
  } = useRegistration();

  const [formData, setFormData] = useState({
    vehicleType: vehicleInfo.vehicle_type || "Motorcycle",
    vehicleBrand: vehicleInfo.vehicle_brand || "",
    vehicleModel: vehicleInfo.vehicle_model || "",
    vehicleColor: vehicleInfo.vehicle_color || "",
    plateNumber: vehicleInfo.plate_number || "",
  });

  // Update form data when context data changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      vehicleType: vehicleInfo.vehicle_type || prev.vehicleType,
      vehicleBrand: vehicleInfo.vehicle_brand || prev.vehicleBrand,
      vehicleModel: vehicleInfo.vehicle_model || prev.vehicleModel,
      vehicleColor: vehicleInfo.vehicle_color || prev.vehicleColor,
      plateNumber: vehicleInfo.plate_number || prev.plateNumber,
    }));
  }, [vehicleInfo]);

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === "vehicleType" && value === "Bicycle") {
        return {
          ...prev,
          vehicleType: value,
          plateNumber: "",
        };
      }

      return {
        ...prev,
        [name]: value,
      };
    });
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Update context with form data
    updateVehicleInfo({
      vehicle_type: formData.vehicleType,
      vehicle_brand: formData.vehicleBrand,
      vehicle_model: formData.vehicleModel,
      vehicle_color: formData.vehicleColor,
      plate_number: formData.plateNumber,
    });

    console.log("=== RIDER REGISTRATION STEP 2 SUBMITTED ===");
    console.log("Form Data:", formData);
    console.log("Updated Vehicle Info:", {
      vehicle_type: formData.vehicleType,
      vehicle_brand: formData.vehicleBrand,
      vehicle_model: formData.vehicleModel,
      vehicle_color: formData.vehicleColor,
      plate_number: formData.plateNumber,
    });
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("===============================================");

    logRegistrationData();

    // Navigate to next step
    navigate("/rider-registration/3");
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log("=== RIDER REGISTRATION STEP 2 MOUNTED ===");
    console.log("Initial Vehicle Data:", vehicleInfo);
    console.log("Current Form Data:", formData);
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("=============================================");
    logRegistrationData();
  }, [logRegistrationData, vehicleInfo, formData]);

  // Form validation
  const isFormValid = () => {
    return (
      formData.vehicleType.trim() !== "" &&
      formData.vehicleBrand.trim() !== "" &&
      formData.vehicleModel.trim() !== "" &&
      formData.vehicleColor.trim() !== "" &&
      (formData.vehicleType === "Motorcycle"
        ? formData.plateNumber.trim() !== ""
        : true)
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      case "vehicleType":
        return formData.vehicleType.trim() !== "";
      case "vehicleBrand":
        return formData.vehicleBrand.trim() !== "";
      case "vehicleModel":
        return formData.vehicleModel.trim() !== "";
      case "vehicleColor":
        return formData.vehicleColor.trim() !== "";
      case "plateNumber":
        return formData.vehicleType === "Motorcycle"
          ? formData.plateNumber.trim() !== ""
          : true;
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
                Tell us about your vehicle
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                We need your vehicle details to verify your eligibility and
                ensure accurate delivery assignments. Make sure the information
                matches your official documents.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form
                  className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]"
                  onSubmit={handleSubmit}
                >
                  {/* Rider Vehicle Type */}
                  <div className="relative my-2.5 z-10">
                    {/* <input
                      type="text"
                      id="vehicleType"
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("vehicleType")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Vehicle Type"
                      required
                    /> */}
                    <label
                      htmlFor="vehicleType"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("vehicleType")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Vehicle Type *
                    </label>
                    <select
                      id="vehicleType"
                      name="vehicleType"
                      value={formData.vehicleType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border-2 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-opacity-20 focus:ring-[#6BBF9A] border-[#D5E8D4] transition-all duration-200"
                      required
                    >
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Bicycle">Bicycle</option>
                    </select>
                  </div>

                  {/* Rider Vehicle Brand */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="vehicleBrand"
                      name="vehicleBrand"
                      value={formData.vehicleBrand}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("vehicleBrand")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Vehicle Brand"
                      required
                    />
                    <label
                      htmlFor="vehicleBrand"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("vehicleBrand")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Vehicle Brand *
                    </label>
                  </div>

                  {/* Rider Vehicle Model */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="vehicleModel"
                      name="vehicleModel"
                      value={formData.vehicleModel}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("vehicleModel")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Vehicle Model"
                      required
                    />
                    <label
                      htmlFor="vehicleModel"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("vehicleModel")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Vehicle Model *
                    </label>
                  </div>

                  {/* Rider Vehicle Color */}
                  <div className="relative my-2.5 z-10">
                    <input
                      type="text"
                      id="vehicleColor"
                      name="vehicleColor"
                      value={formData.vehicleColor}
                      onChange={handleInputChange}
                      className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                        isFieldValid("vehicleColor")
                          ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                          : "border-red-300 focus:border-red-500 focus:ring-red-500"
                      }`}
                      placeholder="Vehicle Color"
                      required
                    />
                    <label
                      htmlFor="vehicleColor"
                      className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                        isFieldValid("vehicleColor")
                          ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                          : "text-red-500 peer-focus:text-red-500"
                      }`}
                    >
                      Vehicle Color *
                    </label>
                  </div>

                  {/* Rider Plate Number */}
                  {formData.vehicleType === "Motorcycle" && (
                    <div className="relative my-2.5 z-10">
                      <input
                        type="text"
                        id="plateNumber"
                        name="plateNumber"
                        value={formData.plateNumber}
                        onChange={handleInputChange}
                        className={`peer w-full px-4 py-3 border-2 rounded-lg text-gray-700 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all duration-200 ${
                          isFieldValid("plateNumber")
                            ? "border-[#D5E8D4] focus:border-[#6BBF9A] focus:ring-[#6BBF9A]"
                            : "border-red-300 focus:border-red-500 focus:ring-red-500"
                        }`}
                        placeholder="Plate Number"
                        required
                      />
                      <label
                        htmlFor="plateNumber"
                        className={`absolute left-4 -top-2.5 bg-white px-2 text-sm transition-all duration-200 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-placeholder-shown:top-3 peer-focus:-top-2.5 peer-focus:text-sm ${
                          isFieldValid("plateNumber")
                            ? "text-[#4DAF7C] peer-focus:text-[#6BBF9A]"
                            : "text-red-500 peer-focus:text-red-500"
                        }`}
                      >
                        Plate Number *
                      </label>
                    </div>
                  )}

                  {/* Progress Bar */}
                  <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
                    <div className="w-[40%] h-1.5 bg-[#004445]"></div>
                  </div>

                  {/* Footer */}
                  <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
                    <button
                      type="button"
                      onClick={() => navigate("/rider-registration")}
                      className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
                    >
                      Back
                    </button>
                    <p className="text-gray-500">4 step(s) to complete</p>
                    <button
                      type="submit"
                      // onClick={handleSubmit}
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

export default RiderStep2;
