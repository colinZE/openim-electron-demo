import { useState, useRef, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { 
  MessageOutlined, 
  ContactsOutlined, 
  UserOutlined,
  SettingOutlined 
} from "@ant-design/icons";
import { Layout } from "antd";
import { CbEvents, MessageType } from "@openim/wasm-client-sdk";
import { MessageItem, RtcInvite, WSEvent } from "@openim/wasm-client-sdk/lib/types/entity";

import { Platform } from "@/utils/platform";
import { useViewport } from "../../hooks/useViewport";
import { OverlayVisibleHandle } from "../../hooks/useOverlayVisible";
import RtcCallModal from "../../pages/common/RtcCallModal";
import { InviteData } from "../../pages/common/RtcCallModal/data";
import emitter from "../../utils/events";
import { getBusinessUserInfo } from "../../api/login";
import { CustomType } from "../../constants";
import { IMSDK } from "../../layout/MainContentWrap";

const MobileLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [value, setValue] = useState(0);
  const viewportHeight = useViewport();
  const rtcRef = useRef<OverlayVisibleHandle>(null);
  const [inviteData, setInviteData] = useState<InviteData>({} as InviteData);

  // 根据当前路径设置导航状态
  const getCurrentTab = () => {
    if (location.pathname.startsWith("/chat")) return 0;
    if (location.pathname.startsWith("/contact")) return 1;
    if (location.pathname.startsWith("/profile")) return 2;
    if (location.pathname.startsWith("/settings")) return 3;
    return 0;
  };

  const handleTabClick = (tabIndex: number) => {
    setValue(tabIndex);
    switch (tabIndex) {
      case 0:
        navigate("/chat");
        break;
      case 1:
        navigate("/contact");
        break;
      case 2:
        navigate("/profile");
        break;
      case 3:
        navigate("/settings");
        break;
    }
  };

  // 添加RTC事件监听器
  useEffect(() => {
    const callRtcHandler = (inviteData: InviteData) => {
      if (rtcRef.current?.isOverlayOpen) return;
      setInviteData(inviteData);
      rtcRef.current?.openOverlay();
    };

    // 处理接收到的通话邀请消息
    const newMessageHandler = ({ data }: WSEvent<MessageItem[]>) => {
      console.log("Received new messages:", data.length, "messages");
      if (rtcRef.current?.isOverlayOpen) {
        console.log("RTC modal is already open, ignoring messages");
        return;
      }
      let rtcInvite = undefined as undefined | RtcInvite;
      data.map((message) => {
        console.log("Processing message:", message.contentType, message);
        if (message.contentType === MessageType.CustomMessage) {
          try {
            const customData = JSON.parse(message.customElem!.data);
            console.log("Custom message data:", customData);
            if (customData.customType === CustomType.CallingInvite) {
              console.log("Found call invitation:", customData.data);
              rtcInvite = customData.data;
            }
          } catch (error) {
            console.error("Failed to parse custom message:", error);
          }
        }
      });
      if (rtcInvite) {
        console.log("Processing call invitation from:", rtcInvite.inviterUserID);
        getBusinessUserInfo([rtcInvite.inviterUserID]).then(({ data: { users } }) => {
          if (users.length === 0) {
            console.log("No user info found for inviter:", rtcInvite!.inviterUserID);
            return;
          }
          console.log("Opening RTC modal for call invitation");
          setInviteData({
            invitation: rtcInvite!,
            participant: {
              userInfo: {
                nickname: users[0].nickname,
                faceURL: users[0].faceURL,
                userID: users[0].userID,
                ex: "",
              },
            },
          });
          rtcRef.current?.openOverlay();
        });
      }
    };

    emitter.on("OPEN_RTC_MODAL", callRtcHandler);
    IMSDK.on(CbEvents.OnRecvNewMessages, newMessageHandler);
    
    return () => {
      emitter.off("OPEN_RTC_MODAL", callRtcHandler);
      IMSDK.off(CbEvents.OnRecvNewMessages, newMessageHandler);
    };
  }, []);

  // 只在移动端显示
  if (!Platform.isMobile()) {
    return <Outlet />;
  }

  const currentTab = getCurrentTab();

  return (
    <div className="h-screen flex flex-col">
      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden pb-14">
        <Outlet />
      </div>
      
      {/* 底部导航 */}
      <Layout.Footer className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 p-0 h-14">
        <div className="flex h-full">
          <div 
            className={`flex-1 flex flex-col items-center justify-center cursor-pointer ${
              currentTab === 0 ? 'text-blue-500' : 'text-gray-500'
            }`}
            onClick={() => handleTabClick(0)}
          >
            <MessageOutlined className="text-lg mb-1" />
            <span className="text-xs">消息</span>
          </div>
          <div 
            className={`flex-1 flex flex-col items-center justify-center cursor-pointer ${
              currentTab === 1 ? 'text-blue-500' : 'text-gray-500'
            }`}
            onClick={() => handleTabClick(1)}
          >
            <ContactsOutlined className="text-lg mb-1" />
            <span className="text-xs">通讯录</span>
          </div>
          <div 
            className={`flex-1 flex flex-col items-center justify-center cursor-pointer ${
              currentTab === 2 ? 'text-blue-500' : 'text-gray-500'
            }`}
            onClick={() => handleTabClick(2)}
          >
            <UserOutlined className="text-lg mb-1" />
            <span className="text-xs">我的</span>
          </div>
          <div 
            className={`flex-1 flex flex-col items-center justify-center cursor-pointer ${
              currentTab === 3 ? 'text-blue-500' : 'text-gray-500'
            }`}
            onClick={() => handleTabClick(3)}
          >
            <SettingOutlined className="text-lg mb-1" />
            <span className="text-xs">设置</span>
          </div>
        </div>
      </Layout.Footer>
      
      {/* RTC通话模态框 */}
      <RtcCallModal ref={rtcRef} inviteData={inviteData} />
    </div>
  );
};

export default MobileLayout;
