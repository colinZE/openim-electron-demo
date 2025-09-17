import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Layout, Button, Drawer } from "antd";
import { ArrowLeftOutlined, MoreOutlined } from "@ant-design/icons";

import ConversationSider from "./ConversationSider";
import { QueryChat } from "./queryChat";
import { isEmbeddedMode } from "@/utils/common";

const MobileChat = () => {
  const { conversationID } = useParams();
  const navigate = useNavigate();
  const [conversationDrawerVisible, setConversationDrawerVisible] = useState(false);
  const embedded = isEmbeddedMode();

  // 如果没有选中对话，显示对话列表
  if (!conversationID) {
    return (
      <Layout className="h-full">
        <Layout.Header className="bg-white px-4 flex items-center justify-between border-b">
          <h1 className="text-lg font-medium m-0">消息</h1>
          <Button 
            type="text" 
            icon={<MoreOutlined />}
            onClick={() => navigate("/settings")}
          />
        </Layout.Header>
        <Layout.Content className="flex-1 overflow-hidden">
          <ConversationSider />
        </Layout.Content>
      </Layout>
    );
  }

  // 如果有选中对话，显示聊天界面
  return (
    <Layout className="h-full">
      <Layout.Header className="bg-white px-4 flex items-center border-b">
        {!embedded && (
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/chat")}
            className="mr-2"
          />
        )}
        <h1 className="text-lg font-medium m-0 flex-1">聊天</h1>
        {!embedded && (
          <Button 
            type="text" 
            icon={<MoreOutlined />}
            onClick={() => setConversationDrawerVisible(true)}
          />
        )}
      </Layout.Header>
      
      <Layout.Content className="flex-1 overflow-hidden">
        <QueryChat />
      </Layout.Content>

      {/* 对话列表抽屉 */}
      <Drawer
        title="消息列表"
        placement="left"
        onClose={() => setConversationDrawerVisible(false)}
        open={conversationDrawerVisible}
        width="80%"
      >
        <ConversationSider />
      </Drawer>
    </Layout>
  );
};

export default MobileChat;
