import { t } from "i18next";
import { create } from "zustand";

import { BusinessUserInfo, getBusinessUserInfo } from "@/api/login";
import { IMSDK, getIMSDK } from "@/layout/MainContentWrap";
import router from "@/routes";
import { feedbackToast } from "@/utils/common";
import { clearIMProfile, getLocale, setLocale } from "@/utils/storage";

import { useContactStore } from "./contact";
import { useConversationStore } from "./conversation";
import { AppSettings, IMConnectState, UserStore } from "./type";

export const useUserStore = create<UserStore>()((set, get) => ({
  syncState: "loading",
  progress: 0,
  reinstall: true,
  isLogining: false,
  connectState: "loading",
  selfInfo: {} as BusinessUserInfo,
  appSettings: {
    locale: getLocale(),
    closeAction: "miniSize",
  },
  updateSyncState: (syncState: IMConnectState) => {
    set({ syncState });
  },
  updateProgressState: (progress: number) => {
    set({ progress });
  },
  updateReinstallState: (reinstall: boolean) => {
    set({ reinstall });
  },
  updateIsLogining: (isLogining: boolean) => {
    set({ isLogining });
  },
  updateConnectState: (connectState: IMConnectState) => {
    set({ connectState });
  },
  getSelfInfoByReq: async () => {
    try {
      const sdk = await getIMSDK();
      const { data } = await sdk.getSelfUserInfo();
      set(() => ({ selfInfo: data as unknown as BusinessUserInfo }));
      getBusinessUserInfo([data.userID]).then(({ data: { users } }) =>
        set((state) => ({ selfInfo: { ...state.selfInfo, ...users[0] } })),
      );
    } catch (error) {
      console.error("Failed to get self info:", error);
      feedbackToast({ error, msg: t("toast.getSelfInfoFailed") });
      get().userLogout();
    }
  },
  updateSelfInfo: (info: Partial<BusinessUserInfo>) => {
    set((state) => ({ selfInfo: { ...state.selfInfo, ...info } }));
  },
  updateAppSettings: (settings: Partial<AppSettings>) => {
    if (settings.locale) {
      setLocale(settings.locale);
    }
    set((state) => ({ appSettings: { ...state.appSettings, ...settings } }));
  },
  userLogout: async (force?: boolean) => {
    try {
      if (!force) {
        const sdk = await getIMSDK();
        await sdk.logout();
      }
    } catch (error) {
      console.error("Failed to logout:", error);
    }
    clearIMProfile();
    set({ selfInfo: {} as BusinessUserInfo, progress: 0 });
    useContactStore.getState().clearContactStore();
    useConversationStore.getState().clearConversationStore();
    router.navigate("/login");
  },
}));
