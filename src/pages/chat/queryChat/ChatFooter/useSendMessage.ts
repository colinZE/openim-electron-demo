import { MessageStatus } from "@openim/wasm-client-sdk";
import { MessageItem, WsResponse } from "@openim/wasm-client-sdk/lib/types/entity";
import { SendMsgParams } from "@openim/wasm-client-sdk/lib/types/params";
import { useCallback } from "react";

import { IMSDK, getIMSDK } from "@/layout/MainContentWrap";
import { useConversationStore, useUserStore } from "@/store";
import { emit } from "@/utils/events";
import { feedbackToast } from "@/utils/common";
import { multiTabDetector } from "@/utils/multiTabDetector";

import { pushNewMessage, updateOneMessage } from "../useHistoryMessageList";

export type SendMessageParams = Partial<Omit<SendMsgParams, "message">> & {
  message: MessageItem;
  needPush?: boolean;
};

export function useSendMessage() {
  const sendMessage = useCallback(
    async ({ recvID, groupID, message, needPush }: SendMessageParams) => {
      const currentConversation = useConversationStore.getState().currentConversation;
      const sourceID = recvID || groupID;
      const inCurrentConversation =
        currentConversation?.userID === sourceID ||
        currentConversation?.groupID === sourceID ||
        !sourceID;
      needPush = needPush ?? inCurrentConversation;

      if (needPush) {
        pushNewMessage(message);
        emit("CHAT_LIST_SCROLL_TO_BOTTOM");
      }

      // 验证必要参数
      if (!message) {
        console.error("Message is required");
        return;
      }

      const finalRecvID = recvID ?? currentConversation?.userID;
      const finalGroupID = groupID ?? currentConversation?.groupID;

      // 检查是否有有效的接收者
      if (!finalRecvID && !finalGroupID) {
        console.error("No valid recipient: recvID and groupID are both empty", {
          recvID: finalRecvID,
          groupID: finalGroupID,
          currentConversation
        });
        updateOneMessage({
          ...message,
          status: MessageStatus.Failed,
        });
        return;
      }

      // 🚨 智能多标签页冲突检查 - 只检查真正的问题场景
      const conflictingTabs = multiTabDetector.getConflictingTabs();
      if (conflictingTabs.length > 0) {
        const currentConversationId = window.location.hash.match(/\/chat\/(.+)$/)?.[1];
        
        // 只检查相同会话的冲突，且当前页面可见时才阻止
        const hasConversationConflict = conflictingTabs.some(tab => 
          tab.conversationId === currentConversationId && 
          document.visibilityState === 'visible' // 只有当前页面可见时才阻止
        );
        
        if (hasConversationConflict) {
          console.warn("🚨 WARNING: Multiple tabs with same conversation detected!");
          console.warn("This may cause message routing issues, but allowing message to proceed");
          
          // 只发出警告，不阻止消息发送
          feedbackToast({ 
            error: "⚠️ 检测到多个标签页打开相同聊天，消息可能显示在错误的页面",
            msg: "检测到多个标签页打开相同聊天"
          });
          
          // 不返回，继续发送消息
        }
      }

      // 🚨 严重安全检查：验证当前URL是否与要发送的目标一致
      const currentPath = window.location.hash;
      const expectedReceiver = finalRecvID || finalGroupID;
      
      if (currentPath && expectedReceiver) {
        // 从URL中提取会话ID进行验证
        const pathMatch = currentPath.match(/\/chat\/(.+)$/);
        if (pathMatch) {
          const urlConversationID = pathMatch[1];
          
          // 验证单聊场景
          if (finalRecvID && urlConversationID.startsWith('si_')) {
            const urlParts = urlConversationID.split('_');
            if (urlParts.length === 3) {
              const [, userID1, userID2] = urlParts;
              const currentUserID = useUserStore.getState().selfInfo.userID;
              
              // 验证URL中的userID是否匹配要发送的目标
              const isValidTarget = (userID1 === finalRecvID && userID2 === currentUserID) ||
                                   (userID2 === finalRecvID && userID1 === currentUserID);
              
              if (!isValidTarget) {
                console.error("🚨 SECURITY ALERT: Message target mismatch!", {
                  urlConversationID,
                  targetRecvID: finalRecvID,
                  currentUserID,
                  urlUserIDs: [userID1, userID2]
                });
                updateOneMessage({
                  ...message,
                  status: MessageStatus.Failed,
                });
                feedbackToast({ 
                  error: "发送失败：会话状态异常，请刷新页面重试",
                  msg: "消息发送验证失败" 
                });
                return;
              }
            }
          }
          
          // 验证群聊场景
          if (finalGroupID && urlConversationID.startsWith('g_')) {
            const urlGroupID = urlConversationID.replace('g_', '');
            if (urlGroupID !== finalGroupID) {
              console.error("🚨 SECURITY ALERT: Group message target mismatch!", {
                urlGroupID,
                targetGroupID: finalGroupID
              });
              updateOneMessage({
                ...message,
                status: MessageStatus.Failed,
              });
              feedbackToast({ 
                error: "发送失败：群聊状态异常，请刷新页面重试",
                msg: "群消息发送验证失败" 
              });
              return;
            }
          }
        }
      }

      const options = {
        recvID: finalRecvID || "",
        groupID: finalGroupID || "",
        message,
        isOnlineOnly: false,
      };

      console.log("Sending message with options:", options);

      try {
        const sdk = await getIMSDK();
        const { data: successMessage } = await sdk.sendMessage(options);
        updateOneMessage(successMessage);
      } catch (error) {
        console.error("Failed to send message:", error);
        updateOneMessage({
          ...message,
          status: MessageStatus.Failed,
        });
      }
    },
    [],
  );

  return {
    sendMessage,
  };
}
