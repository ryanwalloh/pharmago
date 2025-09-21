import React from "react";

// Left Image Container
const LeftImage = ({ src, alt }) => {
  return (
    <div className="relative overflow-hidden">
      <div className="w-full h-full">
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </div>
    </div>
  );
};

export default LeftImage;
