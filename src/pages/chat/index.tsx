import { Layout } from "antd";
import { Outlet } from "react-router-dom";

import { Platform } from "@/utils/platform";
import ConversationSider from "./ConversationSider";
import MobileChat from "./MobileChat";

export const Chat = () => {
  // 移动端使用移动端聊天组件
  if (Platform.isMobile()) {
    return <MobileChat />;
  }

  // 桌面端使用原有布局
  return (
    <Layout className="flex-row">
      <ConversationSider />
      <Outlet />
    </Layout>
  );
};
