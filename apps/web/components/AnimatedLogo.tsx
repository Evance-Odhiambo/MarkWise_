"use client";

import { Logo } from "./Logo";
import { useEffect, useState } from "react";

export function AnimatedLogo() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <div
      className={`transform transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <Logo animated={true} />
    </div>
  );
}

export default AnimatedLogo;
