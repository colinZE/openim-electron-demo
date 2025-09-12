import { UserOutlined, SettingOutlined, LogoutOutlined, EditOutlined } from "@ant-design/icons";
import { Button, Card, Divider, List, Modal, Avatar } from "antd";
import { t } from "i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUserStore } from "@/store";
import { modal } from "@/AntdGlobalComp";
import { feedbackToast } from "@/utils/common";
import OIMAvatar from "@/components/OIMAvatar";

const Profile = () => {
  const navigate = useNavigate();
  const selfInfo = useUserStore((state) => state.selfInfo);
  const userLogout = useUserStore((state) => state.userLogout);

  const handleLogout = () => {
    modal.confirm({
      title: t("placeholder.logOut"),
      content: t("toast.confirmlogOut"),
      onOk: async () => {
        try {
          await userLogout();
          navigate("/login");
        } catch (error) {
          feedbackToast({ error });
        }
      },
    });
  };

  const handleEditProfile = () => {
    // 这里可以打开编辑个人资料的弹窗
    // 暂时显示一个提示
    feedbackToast({ msg: "编辑个人资料功能开发中" });
  };

  const menuItems = [
    {
      icon: <EditOutlined />,
      title: t("placeholder.editInfo"),
      onClick: handleEditProfile,
    },
    {
      icon: <SettingOutlined />,
      title: t("placeholder.accountSetting"),
      onClick: () => navigate("/settings"),
    },
    {
      icon: <LogoutOutlined />,
      title: t("placeholder.logOut"),
      onClick: handleLogout,
    },
  ];

  return (
    <div className="h-full bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* 用户信息卡片 */}
        <Card className="mb-4">
          <div className="text-center">
            <OIMAvatar
              size={80}
              src={selfInfo.faceURL}
              text={selfInfo.nickname}
              className="mb-4"
            />
            <h2 className="text-xl font-semibold mb-1">{selfInfo.nickname}</h2>
            <p className="text-gray-500 text-sm">{selfInfo.userID}</p>
            {selfInfo.email && (
              <p className="text-gray-500 text-sm mt-1">{selfInfo.email}</p>
            )}
          </div>
        </Card>

        {/* 菜单列表 */}
        <Card>
          <List
            dataSource={menuItems}
            renderItem={(item) => (
              <List.Item
                className="cursor-pointer hover:bg-gray-50 rounded-lg px-3"
                onClick={item.onClick}
              >
                <List.Item.Meta
                  avatar={<div className="text-lg">{item.icon}</div>}
                  title={item.title}
                />
              </List.Item>
            )}
          />
        </Card>
      </div>
    </div>
  );
};

export default Profile;
