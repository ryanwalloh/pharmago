import React from 'react';

const Header = () => {
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
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-6">
              <a href="#features" className="text-[#4DAF7C] hover:text-[#2C7A5D] px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Features</a>
              <a href="#about" className="text-[#4DAF7C] hover:text-[#2C7A5D] px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">About</a>
              <a href="#contact" className="text-[#4DAF7C] hover:text-[#2C7A5D] px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200">Contact</a>
              <button className="bg-[#6BBF9A] hover:bg-[#4DAF7C] text-white px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                Get Started
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Header;
