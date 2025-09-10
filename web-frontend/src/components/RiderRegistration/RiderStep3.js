import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRegistration } from "../../contexts/RiderRegistrationContext";
import MinimalHeader from "../common/MinimalHeader";
import LeftImage from "../common/LeftImage";

const RiderStep3 = () => {
  const navigate = useNavigate();
  const {
    documents,
    updateDocuments,
    logRegistrationData,
    getAllRegistrationData,
  } = useRegistration();

  // Form state for document uploads
  const [formData, setFormData] = useState({
    // primaryId: {
    //   file: null,
    //   fileUrl: documents.primary_id?.file_url || "",
    //   uploaded: documents.primary_id_uploaded || false,
    // },
    driverLicense: {
      file: null,
      fileUrl: documents.drivers_license?.file_url || "",
      uploaded: documents.drivers_license_uploaded || false,
    },
    psaBirthCertificate: {
      file: null,
      fileUrl: documents.psa_birth_certificate?.file_url || "",
      uploaded: documents.psa_birth_certificate_uploaded || false,
    },
  });

  // Update form data when context data changes
  useEffect(() => {
    if (documents.drivers_license || documents.psa_birth_certificate) {
      setFormData((prev) => ({
        // primaryId: {
        //   ...prev.primaryId,
        //   file: documents.primary_id?.file || prev.primaryId.file, // Preserve file object
        //   fileUrl: documents.primary_id?.file_url || prev.primaryId.fileUrl,
        //   uploaded: documents.primary_id?.uploaded || prev.primaryId.uploaded,
        // },
        driverLicense: {
          ...prev.driverLicense,
          file: documents.drivers_license?.file || prev.driverLicense.file, // Preserve file object
          fileUrl:
            documents.drivers_license?.file_url || prev.driverLicense.fileUrl,
          uploaded:
            documents.drivers_license?.uploaded || prev.driverLicense.uploaded,
        },
        psaBirthCertificate: {
          ...prev.psaBirthCertificate,
          file:
            documents.psa_birth_certificate?.file ||
            prev.psaBirthCertificate.file, // Preserve file object
          fileUrl:
            documents.psa_birth_certificate?.file_url ||
            prev.psaBirthCertificate.fileUrl,
          uploaded:
            documents.psa_birth_certificate?.uploaded ||
            prev.psaBirthCertificate.uploaded,
        },
      }));
    }
  }, [documents]);

  // Handle file input changes
  const handleFileChange = (documentType, e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type based on document type
      let allowedTypes;
      let maxSize;

      // Documents accept PDF and image formats
      allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
      ];
      maxSize = 10 * 1024 * 1024; // 10MB limit for documents

      if (!allowedTypes.includes(file.type)) {
        const allowedFormats = "PDF, JPG, or PNG";
        alert(`Please upload only ${allowedFormats} files.`);
        return;
      }

      if (file.size > maxSize) {
        const sizeLimit = "10MB";
        alert(`File size must be less than ${sizeLimit}.`);
        return;
      }

      // Store file in state
      // Update context with document data (including file objects)
      setFormData((prev) => {
        const updated = {
          ...prev,
          [documentType]: {
            ...prev[documentType],
            file,
            uploaded: true,
          },
        };

        updateDocuments({
          // primaryId: {
          //   file: formData.primaryId.file,
          //   file_url: formData.primaryId.fileUrl,
          //   uploaded: formData.primaryId.uploaded,
          // },
          drivers_license: {
            file: updated.driverLicense.file,
            file_url: updated.driverLicense.fileUrl,
            uploaded: updated.driverLicense.uploaded,
          },
          psa_birth_certificate: {
            file: updated.psaBirthCertificate.file,
            file_url: updated.psaBirthCertificate.fileUrl,
            uploaded: updated.psaBirthCertificate.uploaded,
          },
        });

        return updated;
      });

      console.log(`File selected: ${file.name} (${file.size} bytes)`);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    console.log("=== RIDER REGISTRATION STEP 3 SUBMITTED ===");
    console.log("Form Data:", formData);
    console.log("Updated Documents:", {
      // primary_id: {
      //   file: formData.primaryId.file?.name || "No file",
      //   file_url: formData.primaryId.fileUrl,
      //   uploaded: formData.primaryId.uploaded,
      // },
      drivers_license: {
        file: formData.driverLicense.file?.name || "No file",
        file_url: formData.driverLicense.fileUrl,
        uploaded: formData.driverLicense.uploaded,
      },
      psa_birth_certificate: {
        file: formData.psaBirthCertificate.file?.name || "No file",
        file_url: formData.psaBirthCertificate.fileUrl,
        uploaded: formData.psaBirthCertificate.uploaded,
      },
    });
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("===============================================");

    logRegistrationData();

    // Navigate to next step
    navigate("/rider-registration/4");
  };

  // Log the current registration data when component mounts
  useEffect(() => {
    console.log("=== RIDER REGISTRATION STEP 3 MOUNTED ===");
    console.log("Initial Documents Data:", documents);
    console.log("Current Form Data:", formData);
    console.log("All Registration Data:", getAllRegistrationData());
    console.log("=============================================");
    logRegistrationData();
  }, [logRegistrationData, documents, formData, getAllRegistrationData]);

  // Debug form validation state
  useEffect(() => {
    const formValid =
      // formData.primaryId.file &&
      formData.driverLicense.file && formData.psaBirthCertificate.file;

    console.log("=== FORM VALIDATION DEBUG ===");
    // console.log("Primary ID:", {
    //   file: formData.primaryId.file?.name || "No file",
    //   isValid: formData.primaryId.file,
    // });
    console.log("Driver's License:", {
      file: formData.driverLicense.file?.name || "No file",
      isValid: formData.driverLicense.file,
    });
    console.log("PSA Birth Certificate:", {
      file: formData.psaBirthCertificate.file?.name || "No file",
      isValid: formData.psaBirthCertificate.file,
    });
    console.log("Overall Form Valid:", formValid);
    console.log("Next Button Enabled:", formValid);
    console.log("=============================");
  }, [formData]);

  // Form validation
  const isFormValid = () => {
    return (
      // formData.primaryId.file &&
      formData.driverLicense.file && formData.psaBirthCertificate.file
    );
  };

  // Check if specific field is valid
  const isFieldValid = (fieldName) => {
    switch (fieldName) {
      // case "primaryId":
      //   return formData.primaryId.file && formData.primaryId.expiryDate !== "";
      case "driverLicense":
        return formData.driverLicense.file;
      case "psaBirthCertificate":
        return formData.psaBirthCertificate.file;
      default:
        return true;
    }
  };

  return (
    <div className="h-screen overflow-hidden font-roboto">
      {/* Header - Simplified version with only logo */}
      <MinimalHeader src="/assets/logosvgdark.svg" alt="PharmaGo Logo" />

      {/* Main Container - Grid Layout */}
      <div className="grid grid-cols-2 h-[calc(100vh-88px)]">
        {/* Left Image Container */}
        <LeftImage src="/images/pharmadocs.png" alt="Pharmacy Documents" />

        {/* Right Form Container */}
        <div className="flex flex-col justify-start items-center h-full text-center relative overflow-y-auto pb-16">
          <div className="flex justify-center relative top-6 pt-6">
            <div className="flex flex-col absolute w-[25vw] justify-start items-start text-[#2c2c2c] max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Header */}
              <h1 className="text-3xl font-bold mb-6 leading-10 flex text-left justify-left text-[#2c2c2c]">
                Upload your verification documents
              </h1>
              <p className="text-base mt-[-7px] text-[#8d8c8c] text-left leading-5 font-normal">
                To keep PharmaGo safe and trustworthy, we'll need a few official
                documents to verify your identity as a rider.
              </p>

              {/* Form */}
              <div className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c]">
                <form
                  className="w-[22vw] pb-5 pt-2.5 flex flex-col text-[#2c2c2c] space-y-4"
                  onSubmit={handleSubmit}
                >
                  {/* Driver's License */}
                  <div className="relative my-2.5 z-10">
                    <div
                      className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                        isFieldValid("driverLicense")
                          ? "border-[#D5E8D4]"
                          : "border-red-300"
                      }`}
                    >
                      <label
                        className={`block text-sm mb-3 font-medium ${
                          isFieldValid("driverLicense")
                            ? "text-[#4DAF7C]"
                            : "text-red-500"
                        }`}
                      >
                        Driver's License *
                      </label>

                      {/* File Upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange("driverLicense", e)}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C]"
                        />
                        {formData.driverLicense.file && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.driverLicense.file.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PSA Birth Certificate */}
                  <div className="relative my-2.5 z-10">
                    <div
                      className={`border-2 rounded-lg p-4 transition-all duration-200 ${
                        isFieldValid("psaBirthCertificate")
                          ? "border-[#D5E8D4]"
                          : "border-red-300"
                      }`}
                    >
                      <label
                        className={`block text-sm mb-3 font-medium ${
                          isFieldValid("psaBirthCertificate")
                            ? "text-[#4DAF7C]"
                            : "text-red-500"
                        }`}
                      >
                        PSA Birth Certificate *
                      </label>

                      {/* File Upload */}
                      <div className="mb-3">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) =>
                            handleFileChange("psaBirthCertificate", e)
                          }
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#6BBF9A] file:text-white hover:file:bg-[#4DAF7C]"
                        />
                        {formData.psaBirthCertificate.file && (
                          <p className="text-xs text-green-600 mt-1">
                            ✓ {formData.psaBirthCertificate.file.name}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* File Requirements Info */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">
                      Document Requirements:
                    </h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Documents: PDF, JPG, PNG (max 10MB each)</li>
                      <li>• Storefront Image: JPG, PNG only (max 2MB)</li>
                      <li>• All documents must be valid and not expired</li>
                      <li>• Clear, readable copies are required</li>
                    </ul>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex flex-row justify-between items-center fixed right-0 bottom-20 w-[50vw] h-1.5 bg-[#c2bdbd] z-30">
        <div className="w-[67%] h-1.5 bg-[#004445]"></div>
      </div>

      {/* Footer */}
      <div className="flex flex-row justify-between items-center w-[48vw] fixed right-2.5 bottom-0 p-5 z-10 gap-2.5">
        <button
          type="button"
          onClick={() => navigate("/rider-registration/2")}
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
    </div>
  );
};

export default RiderStep3;
