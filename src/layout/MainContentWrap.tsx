import { AllowType } from "@openim/wasm-client-sdk";
import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { useConversationStore, useUserStore } from "@/store";
import { emit } from "@/utils/events";
import { getIMToken, getIMUserID, debugStorage } from "@/utils/storage";
import { Platform } from "@/utils/platform";

// H5环境统一使用WASM SDK
let openIMSDK: any = null;
let sdkInitialized = false;
let sdkInitPromise: Promise<any> | null = null;

// 使用动态导入来加载WASM SDK
const initSDK = async () => {
  if (sdkInitPromise) {
    return sdkInitPromise;
  }
  
  sdkInitPromise = (async () => {
    try {
      // 等待Go运行时加载完成
      if (typeof window !== 'undefined' && !(window as any).Go) {
        console.log("Waiting for Go runtime to load...");
        await new Promise((resolve) => {
          const checkGo = () => {
            if ((window as any).Go) {
              resolve(true);
            } else {
              setTimeout(checkGo, 100);
            }
          };
          checkGo();
        });
      }
      
      // 导入WASM SDK
      const wasmSDK = await import("@openim/wasm-client-sdk");
      
      // 使用正确的函数名 getSDK
      const getSDK = wasmSDK.getSDK;
      
      if (!getSDK) {
        throw new Error("getSDK function not found in SDK");
      }
      
      const sdkInstance = getSDK({
        coreWasmPath: "./openIM.wasm",
        sqlWasmPath: `/sql-wasm.wasm`,
      });
      
      openIMSDK = sdkInstance;
      sdkInitialized = true;
      
      // 将SDK实例暴露到全局，方便其他组件检查状态
      if (typeof window !== 'undefined') {
        (window as any).openIMSDK = sdkInstance;
      }
      
      return sdkInstance;
    } catch (error) {
      console.error("Failed to load WASM SDK:", error);
      throw new Error("WASM SDK is required for H5 environment");
    }
  })();
  
  return sdkInitPromise;
};

// 获取SDK实例的函数
export const getIMSDK = async () => {
  if (sdkInitialized && openIMSDK) {
    return openIMSDK;
  }
  return await initSDK();
};

// 创建一个安全的SDK代理
export const IMSDK = new Proxy({} as any, {
  get(target, prop) {
    if (!sdkInitialized || !openIMSDK) {
      // 返回一个空函数，避免抛出错误
      if (typeof prop === 'string') {
        return () => {
          console.warn(`SDK method ${prop} called before initialization`);
        };
      }
      return undefined;
    }
    return openIMSDK[prop];
  }
});

export const MainContentWrap = () => {
  const updateAppSettings = useUserStore((state) => state.updateAppSettings);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loginCheck = async () => {
      try {
        // 调试存储状态
        console.log("=== MainContentWrap Storage Debug ===");
        await debugStorage();
        
        const IMToken = await getIMToken();
        const IMUserID = await getIMUserID();
        
        console.log("MainContentWrap Login check:", { 
          hasToken: !!IMToken, 
          hasUserID: !!IMUserID, 
          currentPath: location.pathname,
          currentHash: window.location.hash,
          tokenValue: IMToken ? "***" + (IMToken as string).slice(-4) : null,
          userIDValue: IMUserID
        });
        
        // 只有在访问非登录页面且没有认证信息时才跳转到登录页面
        if (!IMToken || !IMUserID) {
          if (location.pathname !== "/login") {
            console.log("MainContentWrap: No auth info, redirecting to login");
            navigate("/login");
          }
          return;
        }
        
        // 检查SDK是否已经初始化，如果没有则等待
        if (!sdkInitialized) {
          console.log("MainContentWrap: SDK not initialized yet, waiting...");
          // 等待SDK初始化完成
          const checkSDK = () => {
            if (sdkInitialized) {
              console.log("MainContentWrap: SDK initialized, retrying login check");
              loginCheck();
            } else {
              setTimeout(checkSDK, 100);
            }
          };
          setTimeout(checkSDK, 100);
          return;
        }
        
        // 如果已经登录但当前在登录页面，检查是否有重定向URL
        if (location.pathname === "/login") {
          // 检查hash中是否有重定向信息
          const hash = window.location.hash;
          console.log("MainContentWrap: Current hash:", hash);
          
          const redirectMatch = hash.match(/#\/chat\/[^/]+/);
          
          if (redirectMatch) {
            const redirectPath = redirectMatch[0].substring(1); // 移除#号
            console.log("MainContentWrap: Already logged in, redirecting to:", redirectPath);
            // 直接跳转，不延迟
            navigate(redirectPath);
          } else {
            console.log("MainContentWrap: Already logged in, but no redirect path found");
            // 不强制跳转到/chat，让用户保持在当前页面
          }
        }
        
        // 如果用户直接访问聊天链接，确保能正确导航到该会话
        if (location.pathname.startsWith("/chat/") && location.pathname !== "/chat") {
          console.log("MainContentWrap: Direct chat link access, ensuring proper navigation to:", location.pathname);
          // 不需要额外处理，让路由自然处理
        }
        
        // 调试：记录所有路径变化
        console.log("MainContentWrap: Path change detected:", {
          pathname: location.pathname,
          hash: window.location.hash,
          search: window.location.search,
          fullURL: window.location.href
        });
      } catch (error) {
        console.error("MainContentWrap: Error during login check:", error);
        if (location.pathname !== "/login") {
          navigate("/login");
        }
      }
    };

    // 延迟执行登录检查，确保SDK初始化完成
    const timer = setTimeout(() => {
      loginCheck();
    }, 200);

    return () => clearTimeout(timer);
  }, [location.pathname, navigate]);

  useEffect(() => {
    window.userClick = (userID?: string, groupID?: string) => {
      if (!userID || userID === "AtAllTag") return;

      const currentGroupInfo = useConversationStore.getState().currentGroupInfo;

      if (groupID && currentGroupInfo?.lookMemberInfo === AllowType.NotAllowed) {
        return;
      }

      emit("OPEN_USER_CARD", {
        userID,
        groupID,
        isSelf: userID === useUserStore.getState().selfInfo.userID,
        notAdd:
          Boolean(groupID) &&
          currentGroupInfo?.applyMemberFriend === AllowType.NotAllowed,
      });
    };
  }, []);

  useEffect(() => {
    const initSettingStore = async () => {
      if (!Platform.isElectron()) return;
      try {
        updateAppSettings({
          closeAction:
            (await (window as any).electronAPI?.ipcInvoke("getKeyStore", {
              key: "closeAction",
            })) || "miniSize",
        });
        (window as any).electronAPI?.ipcInvoke("main-win-ready");
      } catch (error) {
        console.error("Failed to initialize Electron settings:", error);
      }
    };

    initSettingStore();
  }, []);

  return <Outlet />;
};
