import { LocaleString } from "@/store/type";
import * as localForage from "localforage";
import { Platform } from "@/utils/platform";

localForage.config({
  name: "OpenCorp-Config",
  storeName: "openim_storage",
  driver: [localForage.INDEXEDDB, localForage.WEBSQL, localForage.LOCALSTORAGE],
});

export const setAreaCode = (areaCode: string) =>
  localStorage.setItem("IM_AREA_CODE", areaCode);
export const setPhoneNumber = (account: string) =>
  localStorage.setItem("IM_PHONE_NUM", account);
export const setEmail = (email: string) => localStorage.setItem("IM_EMAIL", email);
export const setLoginMethod = (method: string) =>
  localStorage.setItem("IM_LOGIN_METHOD", method);
export const setTMToken = (token: string) => {
  // 直接使用localStorage作为主要存储，确保跨标签页同步
  localStorage.setItem("IM_TOKEN", token);
  localForage.setItem("IM_TOKEN", token); // 备用存储
};
export const setChatToken = (token: string) => {
  // 直接使用localStorage作为主要存储，确保跨标签页同步
  localStorage.setItem("IM_CHAT_TOKEN", token);
  localForage.setItem("IM_CHAT_TOKEN", token); // 备用存储
};
export const setTMUserID = (userID: string) => {
  // 直接使用localStorage作为主要存储，确保跨标签页同步
  localStorage.setItem("IM_USERID", userID);
  localForage.setItem("IM_USERID", userID); // 备用存储
};
export const setIMProfile = ({
  chatToken,
  imToken,
  userID,
}: {
  chatToken: string;
  imToken: string;
  userID: string;
}) => {
  console.log("setIMProfile called with:", { 
    userID, 
    imToken: imToken ? "***" + imToken.slice(-4) : null,
    chatToken: chatToken ? "***" + chatToken.slice(-4) : null
  });
  
  setTMToken(imToken);
  setChatToken(chatToken);
  setTMUserID(userID);
  
  // 验证数据是否保存成功
  setTimeout(async () => {
    const savedToken = localStorage.getItem("IM_TOKEN");
    const savedUserID = localStorage.getItem("IM_USERID");
    console.log("setIMProfile verification:", {
      savedToken: savedToken ? "***" + savedToken.slice(-4) : null,
      savedUserID
    });
  }, 100);
};

export const setLocale = (locale: string) => localStorage.setItem("IM_LOCALE", locale);

export const clearIMProfile = () => {
  // 清除localStorage（主要存储）
  localStorage.removeItem("IM_TOKEN");
  localStorage.removeItem("IM_CHAT_TOKEN");
  localStorage.removeItem("IM_USERID");
  
  // 清除user-storage
  localStorage.removeItem("user-storage");
  
  // 清除localForage（备用存储）
  localForage.removeItem("IM_TOKEN");
  localForage.removeItem("IM_CHAT_TOKEN");
  localForage.removeItem("IM_USERID");
};

export const getAreaCode = () => localStorage.getItem("IM_AREA_CODE");
export const getPhoneNumber = () => localStorage.getItem("IM_PHONE_NUM");
export const getEmail = () => localStorage.getItem("IM_EMAIL");
export const getLoginMethod = () =>
  (localStorage.getItem("IM_LOGIN_METHOD") ?? "phone") as "phone" | "email";
export const getIMToken = async () => {
  // 优先从user-storage获取，然后从IM_TOKEN获取
  const userStorage = JSON.parse(localStorage.getItem("user-storage") || "{}");
  const token = userStorage.state?.token || localStorage.getItem("IM_TOKEN");
  console.log("getIMToken:", { 
    fromUserStorage: !!userStorage.state?.token,
    token: token ? "***" + token.slice(-4) : null 
  });
  return token;
};

export const getChatToken = async () => {
  // 优先从user-storage获取，然后从IM_CHAT_TOKEN获取
  const userStorage = JSON.parse(localStorage.getItem("user-storage") || "{}");
  const token = userStorage.state?.token || localStorage.getItem("IM_CHAT_TOKEN");
  console.log("getChatToken:", { 
    fromUserStorage: !!userStorage.state?.token,
    token: token ? "***" + token.slice(-4) : null 
  });
  return token;
};

export const getIMUserID = async () => {
  // 优先从user-storage获取，然后从IM_USERID获取
  const userStorage = JSON.parse(localStorage.getItem("user-storage") || "{}");
  const userID = userStorage.state?.selfInfo?.userID || localStorage.getItem("IM_USERID");
  console.log("getIMUserID:", { 
    fromUserStorage: !!userStorage.state?.selfInfo?.userID,
    userID 
  });
  return userID;
};

export const getLocale = (): LocaleString => {
  if (Platform.isElectron()) {
    return (window as any).electronAPI?.ipcSendSync("getKeyStoreSync", { key: "language" }) ||
           (localStorage.getItem("IM_LOCALE") as LocaleString) ||
           window.navigator.language ||
           "en-US";
  }
  return (localStorage.getItem("IM_LOCALE") as LocaleString) ||
         window.navigator.language ||
         "en-US";
};

// 调试函数：检查所有存储的数据
export const debugStorage = async () => {
  try {
    const keys = await localForage.keys();
    console.log("localForage keys:", keys);
    
    const allData: Record<string, any> = {};
    for (const key of keys) {
      allData[key] = await localForage.getItem(key);
    }
    console.log("localForage all data:", allData);
    
    // 检查localStorage
    const localStorageData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageData[key] = localStorage.getItem(key);
      }
    }
    console.log("localStorage data:", localStorageData);
    
    return { localForage: allData, localStorage: localStorageData };
  } catch (error) {
    console.error("Error debugging storage:", error);
    return null;
  }
};
