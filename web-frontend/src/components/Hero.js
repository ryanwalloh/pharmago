import React from 'react';

const Hero = () => {
  return (
    <div className="relative bg-gradient-to-br from-[#D5E8D4] to-[#A8D5BA] py-20 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Content */}
          <div className="space-y-8">
            <h1 className="text-4xl tracking-tight font-extrabold text-[#2C7A5D] sm:text-5xl md:text-6xl leading-tight">
              Your health, delivered with Care
            </h1>
            <p className="text-lg text-[#4DAF7C] leading-relaxed max-w-lg">
              From prescriptions to daily wellness needs, we connect you with trusted local pharmacies and ensure every order reaches you safely and on time. Download our app and let us deliver care, right to your door.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="flex items-center opacity-75 justify-center text-white rounded-xl font-semibold transition-all duration-200 transform hover:-translate-y-1">
                <img 
                  src="/icons/appstore.svg" 
                  alt="App Store" 
                  className="h-32 w-auto"
                />
              </button>
              <button className="flex items-center opacity-75 justify-center text-white font-semibold transition-all duration-200 transform hover:-translate-y-1">
                <img 
                  src="/icons/googleplay.svg" 
                  alt="Google Play" 
                  className="h-32 w-auto"
                />
              </button>
            </div>
          </div>

          {/* Right Side - iPhone Mockups */}
          <div className="relative h-[520px] left-32 flex justify-center items-center">
            {/* Bottom Phone */}
            <div className="absolute left-32 -bottom-12 transform rotate-[24deg] transition-transform duration-300 hover:scale-105">
              <img 
                src="/images/bottom.png" 
                alt="PharmaGo App Mockup" 
                className="h-[520px] w-auto"
              />
            </div>
            
            {/* Middle Phone */}
            <div className="absolute left-12 bottom-6 transform rotate-12 transition-transform duration-300 hover:scale-105">
              <img 
                src="/images/mid.png" 
                alt="PharmaGo App Mockup" 
                className="h-[520px] w-auto"
              />
            </div>
            
            {/* Top Phone */}
            <div className="absolute -left-12 bottom-20 transition-transform duration-300 hover:scale-105">
              <img 
                src="/images/top.png" 
                alt="PharmaGo App Mockup" 
                className="h-[520px] w-auto"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-[#6BBF9A] opacity-10 rounded-full -translate-x-36 -translate-y-36"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#4DAF7C] opacity-10 rounded-full translate-x-48 translate-y-48"></div>
    </div>
  );
};

export default Hero;
