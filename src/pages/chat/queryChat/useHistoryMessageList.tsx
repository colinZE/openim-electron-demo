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
  
  // 🚨 恢复到官方原本的简单状态管理
  const [loadState, setLoadState] = useState({
    initLoading: true,
    hasMoreOld: true,
    messageList: [] as MessageItem[],
    firstItemIndex: START_INDEX,
  });
  
  const latestLoadState = useLatest(loadState);

  useEffect(() => {
    // 🚨 修复：添加前置条件检查，确保所有状态就绪后再加载消息
    console.log("useHistoryMessageList: Checking prerequisites", { 
      connectState, 
      syncState, 
      conversationID,
      hasUserID: !!selfInfo.userID,
      hasConversationID: !!conversationID
    });
    
    // 只有在所有前置条件都满足时才加载历史消息
    if (connectState === "success" && syncState === "success" && selfInfo.userID && conversationID) {
      console.log("useHistoryMessageList: All prerequisites met, loading messages");
      loadHistoryMessages();
    } else {
      console.log("useHistoryMessageList: Waiting for prerequisites...", { 
        connectState, 
        syncState, 
        hasUserID: !!selfInfo.userID,
        hasConversationID: !!conversationID
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

  // 🚨 新的状态管理方式已经解决了会话切换问题，不再需要额外的清理逻辑

  useEffect(() => {
    const pushNewMessage = (message: MessageItem) => {
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
      const reqConversationID = conversationID;
      const { data } = await IMSDK.getAdvancedHistoryMessageList({
        count: SPLIT_COUNT,
        startClientMsgID: loadMore
          ? latestLoadState.current?.messageList[0]?.clientMsgID
          : "",
        conversationID: conversationID ?? "",
        viewType: ViewType.History,
      });
      // 🚨 关键检查：防止异步请求的竞态条件
      if (conversationID !== reqConversationID) return;
      setTimeout(() =>
        setLoadState((preState) => ({
          ...preState,
          initLoading: false,
          hasMoreOld: !data.isEnd,
          messageList: [...data.messageList, ...(loadMore ? preState.messageList : [])],
          firstItemIndex: preState.firstItemIndex - data.messageList.length,
        })),
      );
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
