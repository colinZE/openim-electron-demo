import { InfoCircleOutlined } from "@ant-design/icons";
import { SessionType } from "@openim/wasm-client-sdk";
import { useUnmount } from "ahooks";
import { Layout } from "antd";
import { t } from "i18next";
import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useConversationStore, useUserStore } from "@/store";
import { getIMSDK } from "@/layout/MainContentWrap";
import { normalizeSingleConversationID } from "@/utils/imCommon";

import ChatContent from "./ChatContent";
import ChatFooter from "./ChatFooter";
import ChatHeader from "./ChatHeader";
import useConversationState from "./useConversationState";

export const QueryChat = () => {
  const { conversationID } = useParams();
  const navigate = useNavigate();
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
      
      // 🎯 标准化会话ID，确保与SDK保持一致
      const normalizedConversationID = normalizeSingleConversationID(conversationID);
      console.log("Original conversationID:", conversationID);
      console.log("Normalized conversationID:", normalizedConversationID);
      
      // 如果会话ID被标准化了，需要重定向到标准化的URL
      if (normalizedConversationID !== conversationID) {
        console.log("会话ID需要标准化，重定向到:", normalizedConversationID);
        navigate(`/chat/${normalizedConversationID}`, { replace: true });
        return;
      }
            
            if (conversationList.length > 0) {
              // 从会话列表中查找匹配的会话
              let foundConversation = conversationList.find(
                (conv) => conv.conversationID === normalizedConversationID
              );
        
              console.log("Found conversation:", foundConversation);
              console.log("All conversation IDs:", conversationList.map(c => c.conversationID));
              console.log("Looking for ID:", conversationID);
        
        if (foundConversation && foundConversation.conversationID !== currentConversation?.conversationID) {
          console.log("=== 会话切换调试 ===");
          console.log("Found conversation:", foundConversation);
          console.log("Current conversation:", currentConversation);
          console.log("Setting current conversation from URL:", foundConversation);
          updateCurrentConversation(foundConversation);
          console.log("Current conversation updated");
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
            let otherUserID = selfInfo.userID === userID1 ? userID2 : userID1;
            
            console.log("=== 调试用户ID计算 ===");
            console.log("会话ID:", conversationID);
            console.log("解析的部分:", parts);
            console.log("用户ID1:", userID1);
            console.log("用户ID2:", userID2);
            console.log("当前用户ID:", selfInfo.userID);
            console.log("当前用户ID类型:", typeof selfInfo.userID);
            console.log("用户ID1类型:", typeof userID1);
            console.log("用户ID2类型:", typeof userID2);
            console.log("selfInfo.userID === userID1:", selfInfo.userID === userID1);
            console.log("selfInfo.userID === userID2:", selfInfo.userID === userID2);
            console.log("selfInfo.userID == userID1:", selfInfo.userID == userID1);
            console.log("selfInfo.userID == userID2:", selfInfo.userID == userID2);
            console.log("selfInfo.userID?.toString() === userID1:", selfInfo.userID?.toString() === userID1);
            console.log("selfInfo.userID?.toString() === userID2:", selfInfo.userID?.toString() === userID2);
            console.log("计算的对方用户ID:", otherUserID);
            console.log("Creating temporary conversation for userID:", otherUserID);
            
            // 如果selfInfo.userID为空或未定义，尝试从localStorage获取
            if (!selfInfo.userID) {
              console.log("selfInfo.userID为空，尝试从localStorage获取");
              const storedUserID = localStorage.getItem("IM_USERID");
              console.log("从localStorage获取的userID:", storedUserID);
              if (storedUserID) {
                const otherUserIDFromStorage = storedUserID === userID1 ? userID2 : userID1;
                console.log("使用localStorage userID计算的对方用户ID:", otherUserIDFromStorage);
                // 更新otherUserID
                otherUserID = otherUserIDFromStorage;
              }
            }
            
            // 异步获取用户信息并创建临时会话
            const createTempConversation = async () => {
              let showName = `User_${otherUserID}`;
              let faceURL = "";
              
              try {
                  console.log("=== 开始获取用户信息 ===");
                  console.log("请求的用户ID:", [otherUserID]);
                  const { getBusinessUserInfo } = await import("@/api/login");
                  const response = await getBusinessUserInfo([otherUserID]);
                  console.log("API响应:", response);
                  
                  if (response?.data?.users && response.data.users.length > 0) {
                    const userInfo = response.data.users[0];
                    console.log("获取到的用户信息:", userInfo);
                    showName = userInfo.nickname || `User_${otherUserID}`;
                    faceURL = userInfo.faceURL || "";
                    console.log("最终设置的显示名称:", showName);
                    console.log("最终设置的头像:", faceURL);
                  } else {
                    console.log("API返回空用户列表或无效响应");
                  }
                } catch (error) {
                  console.error("获取用户信息失败:", error);
                }
              
              const tempConversation = {
                conversationID: normalizedConversationID,
                conversationType: 1, // SessionType.Single
                userID: otherUserID,
                groupID: "",
                showName,
                faceURL,
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
              console.log("Creating temporary conversation:", tempConversation);
              updateCurrentConversation(tempConversation);
              console.log("Temporary conversation created and set");
            };
            
            createTempConversation();
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
        console.log("Conversation list is empty, creating temporary conversation");
        // 会话列表为空时，也需要尝试创建临时会话
        const parts = conversationID.split('_');
        console.log("Parsing conversationID parts:", parts);
        
        if (parts.length === 3 && parts[0] === 'si') {
          // 格式: si_用户ID1_用户ID2
          const userID1 = parts[1];
          const userID2 = parts[2];
          const selfInfo = useUserStore.getState().selfInfo;
          let otherUserID = selfInfo.userID === userID1 ? userID2 : userID1;
          
          console.log("=== 调试用户ID计算（会话列表为空） ===");
          console.log("会话ID:", conversationID);
          console.log("解析的部分:", parts);
          console.log("用户ID1:", userID1);
          console.log("用户ID2:", userID2);
          console.log("当前用户ID:", selfInfo.userID);
          console.log("当前用户ID类型:", typeof selfInfo.userID);
          console.log("用户ID1类型:", typeof userID1);
          console.log("用户ID2类型:", typeof userID2);
          console.log("selfInfo.userID === userID1:", selfInfo.userID === userID1);
          console.log("selfInfo.userID === userID2:", selfInfo.userID === userID2);
          console.log("selfInfo.userID == userID1:", selfInfo.userID == userID1);
          console.log("selfInfo.userID == userID2:", selfInfo.userID == userID2);
          console.log("selfInfo.userID?.toString() === userID1:", selfInfo.userID?.toString() === userID1);
          console.log("selfInfo.userID?.toString() === userID2:", selfInfo.userID?.toString() === userID2);
          console.log("计算的对方用户ID:", otherUserID);
          console.log("Creating temporary conversation for userID:", otherUserID);
          
          // 如果selfInfo.userID为空或未定义，尝试从localStorage获取
          if (!selfInfo.userID) {
            console.log("selfInfo.userID为空，尝试从localStorage获取");
            const storedUserID = localStorage.getItem("IM_USERID");
            console.log("从localStorage获取的userID:", storedUserID);
            if (storedUserID) {
              const otherUserIDFromStorage = storedUserID === userID1 ? userID2 : userID1;
              console.log("使用localStorage userID计算的对方用户ID:", otherUserIDFromStorage);
              // 更新otherUserID
              otherUserID = otherUserIDFromStorage;
            }
          }
          
          // 异步获取用户信息并创建临时会话
          const createTempConversation = async () => {
            let showName = `User_${otherUserID}`;
            let faceURL = "";
            
            try {
              console.log("=== 开始获取用户信息 ===");
              console.log("请求的用户ID:", [otherUserID]);
              const { getBusinessUserInfo } = await import("@/api/login");
              const response = await getBusinessUserInfo([otherUserID]);
              console.log("API响应:", response);
              
              if (response?.data?.users && response.data.users.length > 0) {
                const userInfo = response.data.users[0];
                console.log("获取到的用户信息:", userInfo);
                showName = userInfo.nickname || `User_${otherUserID}`;
                faceURL = userInfo.faceURL || "";
                console.log("最终设置的显示名称:", showName);
                console.log("最终设置的头像:", faceURL);
              } else {
                console.log("API返回空用户列表或无效响应");
              }
            } catch (error) {
              console.error("获取用户信息失败:", error);
            }
            
            const tempConversation = {
              conversationID: normalizedConversationID,
              conversationType: 1, // SessionType.Single
              userID: otherUserID,
              groupID: "",
              showName,
              faceURL,
              recvMsgOpt: 0,
              unreadCount: 0,
              groupAtType: 0,
              draftText: "",
              draftTextTime: 0,
              isPinned: false,
              isPrivateChat: false,
              burnDuration: 30,
              isNotInGroup: false,
              updateUnreadCountTime: 0,
              attachedInfo: "",
              ex: "",
              maxSeq: 0,
              minSeq: 0,
              hasReadSeq: 0,
              msgDestructTime: 0,
              isMsgDestruct: false,
              latestMsg: "",
              latestMsgSendTime: 0,
            };
            
            console.log("Creating temporary conversation:", tempConversation);
            updateCurrentConversation(tempConversation);
          };
          
          createTempConversation(); // 调用异步函数
        } else {
          console.log("Unknown conversationID format:", conversationID);
        }
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
