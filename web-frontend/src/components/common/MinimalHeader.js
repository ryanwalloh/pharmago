import React from "react";

// Header - Simplified version with only logo */
const MinimalHeader = () => {
  return (
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
  );
};

export default RegistrationHeader;
