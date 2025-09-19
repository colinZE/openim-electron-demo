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

     

      // 🎯 确保单聊会话ID的一致性
      let normalizedRecvID = finalRecvID;
      if (finalRecvID && !finalGroupID) {
        // 单聊：确保会话ID按字典序排列
        const selfInfo = useUserStore.getState().selfInfo;
        const userIDs = [selfInfo.userID, finalRecvID].sort();
        normalizedRecvID = userIDs[1]; // 使用较大的用户ID作为接收者
        console.log("🎯 单聊会话ID标准化:", {
          originalRecvID: finalRecvID,
          normalizedRecvID,
          selfInfo: selfInfo.userID,
          sortedIDs: userIDs
        });
      }

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
