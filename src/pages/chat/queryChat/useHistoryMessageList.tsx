import { MessageItem, ViewType } from "@openim/wasm-client-sdk";
import { useLatest, useRequest } from "ahooks";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { IMSDK, getIMSDK } from "@/layout/MainContentWrap";
import { useUserStore } from "@/store";
import emitter, { emit } from "@/utils/events";

const START_INDEX = 10000;
const SPLIT_COUNT = 20;

export function useHistoryMessageList() {
  const { conversationID } = useParams();
  const connectState = useUserStore((state) => state.connectState);
  const syncState = useUserStore((state) => state.syncState);
  const selfInfo = useUserStore((state) => state.selfInfo);
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

        console.log("Loading history messages for conversation:", conversationID);
        const reqConversationID = conversationID;
        const sdk = await getIMSDK();
        
        // 检查SDK状态
        if (!sdk) {
          throw new Error("SDK not available");
        }

        console.log("User logged in:", selfInfo.userID);

        // 验证会话ID格式
        if (!conversationID || conversationID.length < 10) {
          console.warn("Invalid conversationID:", conversationID);
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
          conversationID: conversationID,
          viewType: ViewType.History,
        };
        
        console.log("Calling getAdvancedHistoryMessageList with params:", params);
        const { data } = await sdk.getAdvancedHistoryMessageList(params);
        
        if (conversationID !== reqConversationID) return;
        
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
