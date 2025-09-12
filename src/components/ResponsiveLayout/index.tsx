import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import { Platform } from "@/utils/platform";
import MobileLayout from "../MobileLayout";

const ResponsiveLayout = () => {
  const [isMobile, setIsMobile] = useState(Platform.isMobile());

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 移动端使用移动端布局
  if (isMobile) {
    return <MobileLayout />;
  }

  // 桌面端使用原有布局
  return <Outlet />;
};

export default ResponsiveLayout;
