import { InfoCircleOutlined } from "@ant-design/icons";
import { SessionType } from "@openim/wasm-client-sdk";
import { useUnmount } from "ahooks";
import { Layout } from "antd";
import { t } from "i18next";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { useConversationStore, useUserStore } from "@/store";

import ChatContent from "./ChatContent";
import ChatFooter from "./ChatFooter";
import ChatHeader from "./ChatHeader";
import useConversationState from "./useConversationState";

export const QueryChat = () => {
  const { conversationID } = useParams();
  const updateCurrentConversation = useConversationStore(
    (state) => state.updateCurrentConversation,
  );
  const conversationList = useConversationStore((state) => state.conversationList);
  const currentConversation = useConversationStore((state) => state.currentConversation);

  // 从URL参数设置当前会话
  useEffect(() => {
    if (conversationID) {
      console.log("URL conversationID:", conversationID);
      console.log("Current conversationList length:", conversationList.length);
      console.log("Current conversation:", currentConversation);
      
      if (conversationList.length > 0) {
        // 从会话列表中查找匹配的会话
        const foundConversation = conversationList.find(
          (conv) => conv.conversationID === conversationID
        );
        
        console.log("Found conversation:", foundConversation);
        console.log("All conversation IDs:", conversationList.map(c => c.conversationID));
        
        if (foundConversation && foundConversation.conversationID !== currentConversation?.conversationID) {
          console.log("Setting current conversation from URL:", foundConversation);
          updateCurrentConversation(foundConversation);
        } else if (!foundConversation) {
          console.log("Conversation not found in list, creating temporary conversation");
          // 如果会话列表中找不到，尝试从conversationID解析用户ID
          const parts = conversationID.split('_');
          console.log("Parsing conversationID parts:", parts);
          
          if (parts.length === 3 && parts[0] === 'si') {
            // 格式: si_用户ID1_用户ID2
            const userID1 = parts[1];
            const userID2 = parts[2];
            const selfInfo = useUserStore.getState().selfInfo;
            const otherUserID = selfInfo.userID === userID1 ? userID2 : userID1;
            
            console.log("Creating temporary conversation for userID:", otherUserID);
            const tempConversation = {
              conversationID: conversationID,
              conversationType: 1, // SessionType.Single
              userID: otherUserID,
              groupID: "",
              showName: `User_${otherUserID}`,
              faceURL: "",
              recvMsgOpt: 0,
              unreadCount: 0,
              groupAtType: 0,
              latestMsg: "",
              latestMsgSendTime: 0,
              draftText: "",
              draftTextTime: 0,
              burnDuration: 0,
              msgDestructTime: 0,
              isPinned: false,
              isNotInGroup: false,
              isPrivateChat: false,
              isMsgDestruct: false,
              attachedInfo: "",
              ex: "",
            };
            updateCurrentConversation(tempConversation);
          } else if (parts.length === 2 && parts[0] === 'single') {
            // 标准格式: single_用户ID
            const userID = parts[1];
            console.log("Creating temporary conversation for single userID:", userID);
            const tempConversation = {
              conversationID: conversationID,
              conversationType: 1, // SessionType.Single
              userID: userID,
              groupID: "",
              showName: `User_${userID}`,
              faceURL: "",
              recvMsgOpt: 0,
              unreadCount: 0,
              groupAtType: 0,
              latestMsg: "",
              latestMsgSendTime: 0,
              draftText: "",
              draftTextTime: 0,
              burnDuration: 0,
              msgDestructTime: 0,
              isPinned: false,
              isNotInGroup: false,
              isPrivateChat: false,
              isMsgDestruct: false,
              attachedInfo: "",
              ex: "",
            };
            updateCurrentConversation(tempConversation);
          } else if (parts.length === 2 && parts[0] === 'group') {
            // 群聊格式: group_群组ID
            const groupID = parts[1];
            console.log("Creating temporary conversation for groupID:", groupID);
            const tempConversation = {
              conversationID: conversationID,
              conversationType: 2, // SessionType.Group
              userID: "",
              groupID: groupID,
              showName: `Group_${groupID}`,
              faceURL: "",
              recvMsgOpt: 0,
              unreadCount: 0,
              groupAtType: 0,
              latestMsg: "",
              latestMsgSendTime: 0,
              draftText: "",
              draftTextTime: 0,
              burnDuration: 0,
              msgDestructTime: 0,
              isPinned: false,
              isNotInGroup: false,
              isPrivateChat: false,
              isMsgDestruct: false,
              attachedInfo: "",
              ex: "",
            };
            updateCurrentConversation(tempConversation);
          } else {
            console.log("Unknown conversationID format:", conversationID);
          }
        }
      } else {
        console.log("Conversation list is empty, waiting for it to load...");
      }
    }
  }, [conversationID, conversationList, currentConversation?.conversationID, updateCurrentConversation]);

  useConversationState();

  useUnmount(() => {
    updateCurrentConversation();
  });

  return (
    <Layout id="chat-container" className="relative overflow-hidden h-full flex flex-col">
      <ChatHeader />
      <div className="flex-1 overflow-hidden">
        <ChatContent />
      </div>
      <div className="flex-shrink-0">
        <ChatFooter />
      </div>
    </Layout>
  );
};
