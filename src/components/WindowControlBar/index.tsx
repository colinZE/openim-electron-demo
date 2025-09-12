import { Platform } from "@openim/wasm-client-sdk";
import { useKeyPress } from "ahooks";

import win_close from "@/assets/images/topSearchBar/win_close.png";
import win_max from "@/assets/images/topSearchBar/win_max.png";
import win_min from "@/assets/images/topSearchBar/win_min.png";
import { Platform as AppPlatform } from "@/utils/platform";

const WindowControlBar = () => {
  useKeyPress("esc", () => {
    if (AppPlatform.isElectron()) {
      (window as any).electronAPI?.ipcInvoke("minimizeWindow");
    }
  });

  // H5环境不显示窗口控制栏
  if (!AppPlatform.isElectron() || !(window as any).electronAPI || (window as any).electronAPI?.getPlatform() === Platform.MacOSX) {
    return null;
  }
  return (
    <div className="absolute right-3 top-3.5 z-[99999999] flex h-fit items-center">
      <div
        className="app-no-drag flex h-[14px] cursor-pointer items-center"
        onClick={() => (window as any).electronAPI?.ipcInvoke("minimizeWindow")}
      >
        <img
          className="app-no-drag cursor-pointer"
          width={14}
          src={win_min}
          alt="win_min"
        />
      </div>
      <img
        className="app-no-drag mx-3 cursor-pointer"
        width={13}
        src={win_max}
        alt="win_max"
        onClick={() => (window as any).electronAPI?.ipcInvoke("maxmizeWindow")}
      />
      <img
        className="app-no-drag cursor-pointer"
        width={12}
        src={win_close}
        alt="win_close"
        onClick={() => (window as any).electronAPI?.ipcInvoke("closeWindow")}
      />
    </div>
  );
};

export default WindowControlBar;
