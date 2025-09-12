import { useMount } from "ahooks";
import { Layout, Spin } from "antd";
import { t } from "i18next";
import { Outlet, useMatches, useNavigate } from "react-router-dom";

import { useUserStore } from "@/store";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Platform } from "@/utils/platform";

import LeftNavBar from "./LeftNavBar";
import TopSearchBar from "./TopSearchBar";
import { useGlobalEvent } from "./useGlobalEvents";

export const MainContentLayout = () => {
  useGlobalEvent();
  const matches = useMatches();
  const navigate = useNavigate();

  const progress = useUserStore((state) => state.progress);
  const syncState = useUserStore((state) => state.syncState);
  const reinstall = useUserStore((state) => state.reinstall);
  const isLogining = useUserStore((state) => state.isLogining);

  useMount(() => {
    const isRoot = !matches.find((item) => item.pathname !== "/");
    const inConversation = matches.some((item) => item.params.conversationID);
    
    console.log("MainContentLayout: Navigation check:", {
      isRoot,
      inConversation,
      matches: matches.map(m => ({ pathname: m.pathname, params: m.params }))
    });
    
    // 只有在根路径时才跳转到chat，如果已经在会话中则不要跳转
    if (isRoot && !inConversation) {
      console.log("MainContentLayout: Redirecting from root to chat");
      navigate("chat", {
        replace: true,
      });
    } else if (inConversation) {
      console.log("MainContentLayout: Already in conversation, not redirecting");
    }
  });

  const loadingTip = isLogining ? t("toast.loading") : `${progress}%`;
  const showLockLoading = isLogining || (reinstall && syncState === "loading");

  return (
    <Spin className="!max-h-none" spinning={showLockLoading} tip={loadingTip}>
      {Platform.isMobile() ? (
        <ResponsiveLayout />
      ) : (
        <Layout className="h-full">
          <TopSearchBar />
          <Layout>
            <LeftNavBar />
            <Outlet />
          </Layout>
        </Layout>
      )}
    </Spin>
  );
};
