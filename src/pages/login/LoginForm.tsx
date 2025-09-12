import { Button, Form, Input, QRCode, Select, Space, Tabs } from "antd";
import { t } from "i18next";
import md5 from "md5";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useLogin, useSendSms } from "@/api/login";
import {
  getEmail,
  getPhoneNumber,
  setAreaCode,
  setEmail,
  setIMProfile,
  setPhoneNumber,
} from "@/utils/storage";
import { Platform } from "@/utils/platform";

import { areaCode } from "./areaCode";
import type { FormType } from "./index";
import styles from "./index.module.scss";

// 0login 1resetPassword 2register
enum LoginType {
  Password,
  VerifyCode,
}

type LoginFormProps = {
  setFormType: (type: FormType) => void;
  loginMethod: "phone" | "email";
  updateLoginMethod: (method: "phone" | "email") => void;
};

const LoginForm = ({ loginMethod, setFormType, updateLoginMethod }: LoginFormProps) => {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loginType, setLoginType] = useState<LoginType>(LoginType.Password);
  const { mutate: login, isLoading: loginLoading } = useLogin();
  const { mutate: semdSms } = useSendSms();

  const [countdown, setCountdown] = useState(0);
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prevCountdown) => prevCountdown - 1);
        if (countdown === 1) {
          clearTimeout(timer);
          setCountdown(0);
        }
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const onFinish = (params: API.Login.LoginParams) => {
    if (loginType === 0) {
      // params.password = md5(params.password ?? "");
      params.password = params.password ?? "";
    }
    if (params.phoneNumber) {
      setAreaCode(params.areaCode);
      setPhoneNumber(params.phoneNumber);
    }
    if (params.email) {
      setEmail(params.email);
    }
    login(params, {
      onSuccess: (data) => {
        const { chatToken, imToken, userID } = data.data;
        setIMProfile({ chatToken, imToken, userID });
        
        navigate("/chat");
      },
    });
  };

  const sendSmsHandle = () => {
    const options = {
      phoneNumber: form.getFieldValue("phoneNumber"),
      email: form.getFieldValue("email"),
      areaCode: form.getFieldValue("areaCode"),
      usedFor: 3,
    };
    if (loginMethod === "phone") {
      delete options.email;
    }
    if (loginMethod === "email") {
      delete options.phoneNumber;
      delete options.areaCode;
    }

    semdSms(options, {
      onSuccess() {
        setCountdown(60);
      },
    });
  };

  const onLoginMethodChange = (key: string) => {
    updateLoginMethod(key as "phone" | "email");
  };

  // H5环境的样式类
  const isH5 = Platform.isH5();
  const formClassName = isH5 ? "h5-login-form" : "";
  const inputSize = isH5 ? "large" : "middle";

  return (
    <>
      <div className="flex flex-row items-center justify-between">
        <div className={`font-medium ${isH5 ? 'text-lg' : 'text-xl'}`}>{t("placeholder.welcome")}</div>
      </div>
      <Tabs
        className={`${styles["login-method-tab"]} ${isH5 ? 'mb-6' : ''}`}
        activeKey={loginMethod}
        items={[
          { key: "phone", label: t("placeholder.phoneNumber") },
          { key: "email", label: t("placeholder.email") },
        ]}
        onChange={onLoginMethodChange}
      />
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        autoComplete="off"
        labelCol={{ prefixCls: "custom-form-item" }}
        className={formClassName}
        initialValues={{
          areaCode: "+86",
          phoneNumber: getPhoneNumber() ?? "",
          email: getEmail() ?? "",
        }}
      >
        {loginMethod === "phone" ? (
          <Form.Item label={t("placeholder.phoneNumber")}>
            <Space.Compact className="w-full">
              <Form.Item name="areaCode" noStyle>
                <Select 
                  options={areaCode} 
                  className={isH5 ? "!w-24" : "!w-28"} 
                  size={inputSize}
                />
              </Form.Item>
              <Form.Item name="phoneNumber" noStyle>
                <Input 
                  allowClear 
                  placeholder={t("toast.inputPhoneNumber")} 
                  size={inputSize}
                />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
        ) : (
          <Form.Item
            label={t("placeholder.email")}
            name="email"
            rules={[{ type: "email", message: t("toast.inputCorrectEmail") }]}
          >
            <Input 
              allowClear 
              placeholder={t("toast.inputEmail")} 
              size={inputSize}
            />
          </Form.Item>
        )}

        {loginType === LoginType.VerifyCode ? (
          <Form.Item label={t("placeholder.verifyCode")} name="verifyCode">
            <Space.Compact className="w-full">
              <Input
                allowClear
                placeholder={t("toast.inputVerifyCode")}
                className="w-full"
                size={inputSize}
              />
              <Button 
                type="primary" 
                onClick={sendSmsHandle} 
                loading={countdown > 0}
                size={inputSize}
              >
                {countdown > 0
                  ? t("date.second", { num: countdown })
                  : t("placeholder.sendVerifyCode")}
              </Button>
            </Space.Compact>
          </Form.Item>
        ) : (
          <Form.Item label={t("placeholder.password")} name="password">
            <Input.Password 
              allowClear 
              placeholder={t("toast.inputPassword")} 
              size={inputSize}
            />
          </Form.Item>
        )}

        <div className={`${isH5 ? 'mb-6' : 'mb-10'} flex flex-row justify-between`}>
          <span
            className={`cursor-pointer text-gray-400 ${isH5 ? 'text-base' : 'text-sm'}`}
            onClick={() => setFormType(1)}
          >
            {t("placeholder.forgetPassword")}
          </span>
          <span
            className={`cursor-pointer text-[var(--primary)] ${isH5 ? 'text-base' : 'text-sm'}`}
            onClick={() =>
              setLoginType(
                loginType === LoginType.Password
                  ? LoginType.VerifyCode
                  : LoginType.Password,
              )
            }
          >
            {`${
              loginType === LoginType.Password
                ? t("placeholder.verifyCode")
                : t("placeholder.password")
            }${t("placeholder.login")}`}
          </span>
        </div>

        <Form.Item className={isH5 ? "mb-6" : "mb-4"}>
          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            loading={loginLoading}
            size={inputSize}
            className={isH5 ? "h-12 text-base" : ""}
          >
            {t("placeholder.login")}
          </Button>
        </Form.Item>

        <div className={`flex flex-row items-center justify-center ${isH5 ? 'mt-4' : ''}`}>
          <span className={`text-gray-400 ${isH5 ? 'text-base' : 'text-sm'}`}>
            {t("placeholder.registerToast")}
          </span>
          <span
            className={`cursor-pointer text-blue-500 ${isH5 ? 'text-base' : 'text-sm'}`}
            onClick={() => setFormType(2)}
          >
            {t("placeholder.toRegister")}
          </span>
        </div>
      </Form>
    </>
  );
};

export default LoginForm;
