import React, { useState, useEffect } from "react";
import { useRegistration } from "../../contexts/RiderRegistrationContext";
import MinimalHeader from "../common/MinimalHeader";
import LeftImage from "../common/LeftImage";
import { useNavigate } from "react-router-dom";

const Submission = ({}) => {
  const navigate = useNavigate();

  const {
    prepareFinalSubmissionData,
    getAllRegistrationData,
    resetRegistration,
  } = useRegistration();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState(null);

  // Handle final submission
  const handleFinalSubmission = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Prepare all collected data
      const submissionData = prepareFinalSubmissionData();

      console.log("=== FINAL SUBMISSION STARTING ===");
      console.log("All Registration Data:", getAllRegistrationData());
      console.log("Prepared Submission Data:", submissionData);
      console.log("================================");

      // Create FormData for file uploads
      const formData = new FormData();

      // Add all form fields (now flattened)
      Object.keys(submissionData).forEach((key) => {
        if (
          submissionData[key] !== null &&
          submissionData[key] !== undefined &&
          submissionData[key] !== ""
        ) {
          // Handle different data types
          if (submissionData[key] instanceof File) {
            formData.append(key, submissionData[key]);
          } else if (
            typeof submissionData[key] === "object" &&
            submissionData[key] !== null
          ) {
            // Skip empty objects (like empty file objects), but include arrays even if empty
            if (
              Array.isArray(submissionData[key]) ||
              Object.keys(submissionData[key]).length > 0
            ) {
              // Convert objects/arrays to JSON strings
              formData.append(key, JSON.stringify(submissionData[key]));
            }
          } else {
            formData.append(key, submissionData[key]);
          }
        }
      });

      // Log FormData contents for debugging
      console.log("=== FORMDATA CONTENTS DEBUG ===");
      console.log("FormData entries:");
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value, `(type: ${typeof value})`);
      }

      // Submit to API
      const response = await fetch(
        "http://localhost:8000/api/v1/users/register_rider/", // Not yet register in the backed (replace nlng)
        {
          method: "POST",
          body: formData,
          // Don't set Content-Type header - let browser set it with boundary for multipart/form-data
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error("=== REGISTRATION ERROR RESPONSE ===");
        console.error("Full Error Data:", JSON.stringify(errorData, null, 2));
        console.error("Validation Errors:", errorData.validation_errors);
        console.error("Error Message:", errorData.error);
        console.error("Details:", errorData.details);
        console.error("===============================");

        // Show detailed validation errors if available
        if (
          errorData.validation_errors &&
          Object.keys(errorData.validation_errors).length > 0
        ) {
          const validationErrors = Object.entries(errorData.validation_errors)
            .map(
              ([field, errors]) =>
                `${field}: ${
                  Array.isArray(errors) ? errors.join(", ") : errors
                }`
            )
            .join("\n");
          throw new Error(`Validation failed:\n${validationErrors}`);
        }

        // If no validation errors but there's an error message
        if (errorData.error) {
          throw new Error(errorData.error);
        }

        // If there are details
        if (errorData.details) {
          throw new Error(errorData.details);
        }

        throw new Error(
          "Registration failed - no specific error details available"
        );
      }

      const result = await response.json();

      console.log("=== SUBMISSION SUCCESSFUL ===");
      console.log("Registration completed successfully!");
      console.log("Response:", result);
      console.log("=============================");

      // Clear registration data
      resetRegistration();

      // Navigate to success page or dashboard
      navigate("/rider-registration/success");
    } catch (error) {
      console.error("=== SUBMISSION ERROR ===");
      console.error("Error:", error);
      console.error("========================");

      setSubmissionError(
        error.message || "An error occurred during submission"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get all collected data for review
  const allData = getAllRegistrationData();

  return (
    <div className="h-screen overflow-hidden font-roboto">
      {/* Header - Simplified version with only logo */}
      <MinimalHeader src="/assets/logosvgdark.svg" alt="PharmaGo Logo" />

      {/* Main Container - Grid Layout */}
      <div className="grid grid-cols-2 h-[calc(100vh-88px)]">
        {/* Left Image Container */}
        <LeftImage
          src="/images/pharmasubmit.png"
          alt="Registration Submission"
        />

        {/* Right Form Container */}
        <div className="flex flex-col justify-start items-center h-full text-center relative overflow-y-auto pb-16">
          <div className="flex justify-center relative top-6 pt-6">
            <div className="flex flex-col absolute w-[25vw] justify-start items-start text-[#2c2c2c] max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Header */}
              <h1 className="text-3xl font-bold mb-6 leading-10 flex text-left justify-left text-[#2c2c2c]">
                Review and submit your registration
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                Please review all your information before submitting. You can go
                back to make changes if needed.
              </p>

              {/* Review Section */}
              <div className="w-[22vw] h-[55vh] pb-5 pt-2.5 flex flex-col text-[#2c2c2c] space-y-4">
                {/* User Account Information */}
                <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#4DAF7C] mb-3">
                    Account Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Full Name:</span>{" "}
                      {allData.userAccount.first_name}{" "}
                      {allData.userAccount.middle_name}{" "}
                      {allData.userAccount.last_name}
                    </p>
                    <p>
                      <span className="font-medium">Date of Birth:</span>{" "}
                      {allData.userAccount.date_of_birth}
                    </p>
                    <p>
                      <span className="font-medium">Gender:</span>{" "}
                      {allData.userAccount.gender}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span>{" "}
                      {allData.userAccount.email}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span>{" "}
                      {allData.userAccount.phone}
                    </p>
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#4DAF7C] mb-3">
                    Vehicle Information
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Type:</span>{" "}
                      {allData.vehicleInfo.vehicle_type}
                    </p>
                    <p>
                      <span className="font-medium">Brand:</span>{" "}
                      {allData.vehicleInfo.vehicle_brand}
                    </p>
                    <p>
                      <span className="font-medium">Model:</span>{" "}
                      {allData.vehicleInfo.vehicle_model}
                    </p>
                    <p>
                      <span className="font-medium">Color:</span>{" "}
                      {allData.vehicleInfo.vehicle_color}
                    </p>
                    {allData.vehicleInfo.vehicle_type === "Motorcycle" && (
                      <p>
                        <span className="font-medium">Plate Number:</span>{" "}
                        {allData.vehicleInfo.plate_number}
                      </p>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="border-2 border-[#D5E8D4] rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-[#4DAF7C] mb-3">
                    Documents
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Driver's License:</span>{" "}
                      {allData.documents.drivers_license?.file
                        ? "✓ Uploaded"
                        : "✗ Missing"}
                    </p>
                    <p>
                      <span className="font-medium">
                        PSA Birth Certificate:
                      </span>{" "}
                      {allData.documents.psa_birth_certificate?.file
                        ? "✓ Uploaded"
                        : "✗ Missing"}
                    </p>
                  </div>
                </div>

                {/* Error Display */}
                {submissionError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{submissionError}</p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleFinalSubmission}
                  disabled={isSubmitting}
                  className={`w-full font-semibold py-4 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                    isSubmitting
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-[#4DAF7C] hover:bg-[#2C7A5D] text-white"
                  }`}
                >
                  {isSubmitting ? "Submitting..." : "Submit Registration"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[100%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button
          type="button"
          onClick={() => navigate("/rider-registration/4")}
          className="text-base bg-white text-[#2c786c] border-none py-1.5 px-5 font-bold rounded hover:bg-gray-100 transition-colors"
        >
          Back
        </button>
        <p className="text-gray-500">Final step</p>
        <div></div>
      </div>
    </div>
  );
};

export default Submission;
