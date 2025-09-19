import { MessageItem, ViewType } from "@openim/wasm-client-sdk";
import { useLatest, useRequest } from "ahooks";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { IMSDK, getIMSDK } from "@/layout/MainContentWrap";
import { useUserStore, useConversationStore } from "@/store";
import emitter, { emit } from "@/utils/events";
import { normalizeSingleConversationID } from "@/utils/imCommon";
import { multiTabDetector } from "@/utils/multiTabDetector";

const START_INDEX = 10000;
const SPLIT_COUNT = 20;

export function useHistoryMessageList() {
  const { conversationID } = useParams();
  const connectState = useUserStore((state) => state.connectState);
  const syncState = useUserStore((state) => state.syncState);
  const selfInfo = useUserStore((state) => state.selfInfo);
  const currentConversation = useConversationStore((state) => state.currentConversation);
  const [loadState, setLoadState] = useState({
    initLoading: true,
    hasMoreOld: true,
    messageList: [] as MessageItem[],
    firstItemIndex: START_INDEX,
  });
  const latestLoadState = useLatest(loadState);

  useEffect(() => {
    // 只有在连接成功、同步完成且用户信息加载完成时才加载历史消息
    console.log("useHistoryMessageList: Checking connection state", { 
      connectState, 
      syncState, 
      conversationID,
      selfInfo: selfInfo,
      hasUserID: !!selfInfo.userID
    });
    
    if (connectState === "success" && syncState === "success" && selfInfo.userID) {
      console.log("useHistoryMessageList: All conditions met, loading messages");
      loadHistoryMessages();
    } else {
      console.log("useHistoryMessageList: Waiting for all conditions to be met...", { 
        connectState, 
        syncState, 
        hasUserID: !!selfInfo.userID 
      });
    }
    return () => {
      setLoadState(() => ({
        initLoading: true,
        hasMoreOld: true,
        messageList: [] as MessageItem[],
        firstItemIndex: START_INDEX,
      }));
    };
  }, [conversationID, connectState, syncState, selfInfo.userID]);

  useEffect(() => {
    const pushNewMessage = (message: MessageItem) => {
      // 🚨 智能消息接收安全检查
      const currentConversationId = window.location.hash.match(/\/chat\/(.+)$/)?.[1];
      
      // 只在真正有问题时才阻止消息显示
      const conflictingTabs = multiTabDetector.getConflictingTabs();
      if (conflictingTabs.length > 0 && currentConversationId) {
        const hasConversationConflict = conflictingTabs.some(tab => 
          tab.conversationId === currentConversationId
        );
        
        if (hasConversationConflict) {
          console.warn("🚨 Multi-tab conflict detected, but allowing message:", {
            messageId: message.clientMsgID,
            conversationId: currentConversationId,
            conflictingTabs: conflictingTabs.map(t => t.tabId)
          });
          // 不阻止，继续显示消息
        }
      }
      
      // 验证消息是否属于当前会话 - 保持这个验证
      if (currentConversationId && currentConversation) {
        const messageBelongsToCurrentConversation = 
          (message.recvID && (message.recvID === currentConversation.userID || message.recvID === selfInfo.userID)) ||
          (message.groupID && message.groupID === currentConversation.groupID);
        
        if (!messageBelongsToCurrentConversation) {
          console.warn("🚨 Message conversation mismatch, dropping:", {
            messageRecvID: message.recvID,
            messageGroupID: message.groupID,
            currentConversationUserID: currentConversation.userID,
            currentConversationGroupID: currentConversation.groupID,
            urlConversationID: conversationID,
            messageId: message.clientMsgID
          });
          return;
        }
      }

      if (
        latestLoadState.current?.messageList.find(
          (item) => item.clientMsgID === message.clientMsgID,
        )
      ) {
        return;
      }
      setLoadState((preState) => ({
        ...preState,
        messageList: [...preState.messageList, message],
      }));
    };
    const updateOneMessage = (message: MessageItem) => {
      setLoadState((preState) => {
        const tmpList = [...preState.messageList];
        const idx = tmpList.findIndex((msg) => msg.clientMsgID === message.clientMsgID);
        if (idx < 0) {
          return preState;
        }

        tmpList[idx] = { ...tmpList[idx], ...message };
        return {
          ...preState,
          messageList: tmpList,
        };
      });
    };
    emitter.on("PUSH_NEW_MSG", pushNewMessage);
    emitter.on("UPDATE_ONE_MSG", updateOneMessage);
    return () => {
      emitter.off("PUSH_NEW_MSG", pushNewMessage);
      emitter.off("UPDATE_ONE_MSG", updateOneMessage);
    };
  }, []);

  const loadHistoryMessages = () => getMoreOldMessages(false);

  const { loading: moreOldLoading, runAsync: getMoreOldMessages } = useRequest(
    async (loadMore = true) => {
      try {
        // 验证conversationID
        if (!conversationID) {
          console.warn("No conversationID provided, skipping history load");
          setLoadState((preState) => ({
            ...preState,
            initLoading: false,
            hasMoreOld: false,
          }));
          return;
        }

        // 使用当前会话的实际ID，而不是URL中的ID
        const actualConversationID = currentConversation?.conversationID || normalizeSingleConversationID(conversationID || '');
        console.log("Loading history messages for conversation:", actualConversationID);
        console.log("URL conversationID:", conversationID);
        console.log("Current conversation ID:", currentConversation?.conversationID);
        
        const reqConversationID = actualConversationID;
        const sdk = await getIMSDK();
        
        // 检查SDK状态
        if (!sdk) {
          throw new Error("SDK not available");
        }

        console.log("User logged in:", selfInfo.userID);

        // 验证会话ID格式
        if (!actualConversationID || actualConversationID.length < 10) {
          console.warn("Invalid conversationID:", actualConversationID);
          setLoadState((preState) => ({
            ...preState,
            initLoading: false,
            hasMoreOld: false,
          }));
          return;
        }

        const params = {
          count: SPLIT_COUNT,
          startClientMsgID: loadMore
            ? latestLoadState.current?.messageList[0]?.clientMsgID
            : "",
          conversationID: actualConversationID,
          viewType: ViewType.History,
        };
        
        console.log("Calling getAdvancedHistoryMessageList with params:", params);
        const { data } = await sdk.getAdvancedHistoryMessageList(params);
        
        if (actualConversationID !== reqConversationID) return;
        
        console.log("History messages loaded:", data.messageList?.length || 0, "messages");
        setTimeout(() =>
          setLoadState((preState) => ({
            ...preState,
            initLoading: false,
            hasMoreOld: !data.isEnd,
            messageList: [...data.messageList, ...(loadMore ? preState.messageList : [])],
            firstItemIndex: preState.firstItemIndex - data.messageList.length,
          })),
        );
      } catch (error) {
        console.error("Failed to load history messages:", error);
        setLoadState((preState) => ({
          ...preState,
          initLoading: false,
          hasMoreOld: false,
        }));
      }
    },
    {
      manual: true,
    },
  );

  return {
    SPLIT_COUNT,
    loadState,
    latestLoadState,
    conversationID,
    moreOldLoading,
    getMoreOldMessages,
  };
}

export const pushNewMessage = (message: MessageItem) => emit("PUSH_NEW_MSG", message);
export const updateOneMessage = (message: MessageItem) =>
  emit("UPDATE_ONE_MSG", message);
