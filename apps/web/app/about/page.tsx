"use client";
import React from "react";

const AboutPage: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="container mx-auto px-4 py-4 text-center text-gray-600">
        <p>&copy; {new Date().getFullYear()} MarkWise. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default AboutPage;
