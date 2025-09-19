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

     

      // 🎯 修复：保持原始接收者ID，不进行标准化
      // 会话ID标准化只用于会话识别，不应该改变消息的接收者
      const normalizedRecvID = finalRecvID;
      console.log("🎯 消息发送详情:", {
        originalRecvID: finalRecvID,
        finalRecvID: finalRecvID,
        selfInfo: useUserStore.getState().selfInfo.userID,
        currentConversation: currentConversation
      });

      const options = {
        recvID: normalizedRecvID || "",
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
