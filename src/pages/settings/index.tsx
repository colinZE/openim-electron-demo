import { ArrowLeftOutlined, CheckOutlined } from "@ant-design/icons";
import { Button, Card, Checkbox, Divider, List } from "antd";
import { t } from "i18next";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useUserStore } from "@/store";
import { LocaleString } from "@/store/type";
import i18n from "@/i18n";

const Settings = () => {
  const navigate = useNavigate();
  const localeStr = useUserStore((state) => state.appSettings.locale);
  const updateAppSettings = useUserStore((state) => state.updateAppSettings);

  const localeChange = (checked: boolean, locale: LocaleString) => {
    if (!checked) return;
    i18n.changeLanguage(locale);
    updateAppSettings({
      locale,
    });
  };

  const languageOptions = [
    { value: "zh-CN", label: "简体中文" },
    { value: "en-US", label: "English" },
  ];

  return (
    <div className="h-full bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate("/profile")}
          className="mr-3"
        />
        <h1 className="text-lg font-semibold">{t("placeholder.accountSetting")}</h1>
      </div>

      <div className="p-4">
        <div className="max-w-md mx-auto">
          {/* 语言设置 */}
          <Card title={t("placeholder.chooseLanguage")} className="mb-4">
            <div className="space-y-3">
              {languageOptions.map((option) => (
                <div key={option.value} className="flex items-center justify-between">
                  <span>{option.label}</span>
                  <Checkbox
                    checked={localeStr === option.value}
                    onChange={(e) => localeChange(e.target.checked, option.value as LocaleString)}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* 其他设置 */}
          <Card title="其他设置" className="mb-4">
            <List>
              <List.Item>
                <div className="flex items-center justify-between w-full">
                  <span>消息通知</span>
                  <Checkbox defaultChecked />
                </div>
              </List.Item>
              <Divider className="my-2" />
              <List.Item>
                <div className="flex items-center justify-between w-full">
                  <span>声音提醒</span>
                  <Checkbox defaultChecked />
                </div>
              </List.Item>
              <Divider className="my-2" />
              <List.Item>
                <div className="flex items-center justify-between w-full">
                  <span>震动提醒</span>
                  <Checkbox defaultChecked />
                </div>
              </List.Item>
            </List>
          </Card>

          {/* 关于信息 */}
          <Card title="关于" className="mb-4">
            <div className="text-center text-gray-500">
              <p>OpenIM H5 Demo</p>
              <p className="text-sm mt-2">版本 1.0.0</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
