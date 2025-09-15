import { Button, Form, Input, QRCode, Select, Space, Tabs, message, App } from "antd";
import { t } from "i18next";
import md5 from "md5";
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

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
  const location = useLocation();
  const [form] = Form.useForm();
  const [loginType, setLoginType] = useState<LoginType>(LoginType.Password);
  const { mutate: login, isLoading: loginLoading } = useLogin();
  const { mutate: semdSms } = useSendSms();
  const { message: messageApi } = App.useApp();

  const [countdown, setCountdown] = useState(0);
  const [isImplicitLogin, setIsImplicitLogin] = useState(false);
  const [isImplicitLoading, setIsImplicitLoading] = useState(false);
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

  // 检测APP隐式登录请求
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const isImplicit = params.get('implicit') === 'true';
    
    console.log('登录页面加载，当前URL:', window.location.href);
    console.log('登录页面加载，location.search:', location.search);
    console.log('登录页面加载，所有URL参数:', Object.fromEntries(params.entries()));
    
    if (isImplicit) {
      console.log('检测到APP隐式登录请求');
      setIsImplicitLogin(true);
      
      // 方案1: 从URL参数获取凭据（推荐用于测试环境）
      const email = params.get('email');
      const password = params.get('password');
      const areaCode = params.get('areaCode') || '+86';
      const redirectPath = params.get('redirect');
      
      if (email && password) {
        console.log('使用URL参数方式登录（测试环境）');
        console.log('重定向路径:', redirectPath);
        
        // 自动填充表单
        form.setFieldsValue({ 
          email, 
          password, 
          areaCode,
          phoneNumber: email.includes('@') ? '' : email
        });
        
        // 根据邮箱或手机号设置登录方式
        if (email.includes('@')) {
          updateLoginMethod('email');
        } else {
          updateLoginMethod('phone');
        }
        
        // 自动执行登录流程（H5页面会处理SDK初始化）
        handleImplicitLogin({ email, password, areaCode, redirectPath: redirectPath || undefined });
      } else {
        // 等待APP通过POST消息传递凭据
        console.log('等待APP通过POST消息传递登录凭据');
      }
    }
    
    // 监听来自APP的POST消息
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'APP_IMPLICIT_LOGIN') {
        console.log('收到APP隐式登录消息');
        const { credentials } = event.data;
        
        // 自动填充表单
        form.setFieldsValue({ 
          email: credentials.email, 
          password: credentials.password, 
          areaCode: credentials.areaCode,
          phoneNumber: credentials.email.includes('@') ? '' : credentials.email
        });
        
        // 根据邮箱或手机号设置登录方式
        if (credentials.email.includes('@')) {
          updateLoginMethod('email');
        } else {
          updateLoginMethod('phone');
        }
        
        // 自动执行登录流程
        handleImplicitLogin(credentials);
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [location, form, updateLoginMethod]);

  // 处理APP隐式登录
  const handleImplicitLogin = async (credentials: {
    email: string;
    password: string;
    areaCode: string;
    redirectPath?: string;
  }) => {
    try {
      console.log('开始隐式登录流程:', credentials);
      setIsImplicitLoading(true);
      
      // 显示隐式登录状态
      messageApi.loading('正在自动登录中...', 0);
      
      // 自动发送验证码
      console.log('发送验证码...');
      await sendVerificationCode(credentials.email, credentials.areaCode);
      console.log('验证码发送成功');
      
      // 自动获取验证码（测试环境可能使用固定值）
      console.log('获取验证码...');
      const verifyCode = await getVerificationCode(credentials.email);
      console.log('获取到验证码:', verifyCode);
      
      // 执行登录
      console.log('开始执行登录...');
      login({
        email: credentials.email,
        password: credentials.password,
        verifyCode: verifyCode,
        areaCode: credentials.areaCode,
      }, {
        onSuccess: (data) => {
          console.log('登录成功:', data);
          messageApi.destroy(); // 清除加载提示
          messageApi.success('自动登录成功');
          
          const { chatToken, imToken, userID } = data.data;
          setIMProfile({ chatToken, imToken, userID });
          
          // 通知APP登录成功
          notifyAppLoginSuccess({ chatToken, imToken, userID });
          
          // 使用保存的重定向路径
          console.log('隐式登录成功，保存的重定向路径:', credentials.redirectPath);
          
          if (credentials.redirectPath) {
            console.log('隐式登录成功，跳转到指定页面:', credentials.redirectPath);
            navigate(credentials.redirectPath);
          } else {
            console.log('隐式登录成功，跳转到默认聊天页面');
            navigate("/chat");
          }
        },
        onError: (error) => {
          console.error('登录失败:', error);
          messageApi.destroy(); // 清除加载提示
          messageApi.error('自动登录失败');
          
          // 通知APP登录失败
          notifyAppLoginFailed(error);
          
          // 显示正常登录表单
          setIsImplicitLogin(false);
        }
      });
    } catch (error) {
      console.error('隐式登录处理失败:', error);
      messageApi.destroy();
      messageApi.error('隐式登录处理失败');
      setIsImplicitLogin(false);
    } finally {
      setIsImplicitLoading(false);
    }
  };

  // 发送验证码
  const sendVerificationCode = async (email: string, areaCode: string) => {
    const options: any = {
      usedFor: 3, // 3 = Login
    };

    if (email.includes('@')) {
      options.email = email;
    } else {
      options.phoneNumber = email;
      options.areaCode = areaCode;
    }

    return new Promise((resolve, reject) => {
      semdSms(options, {
        onSuccess() {
          resolve(true);
        },
        onError(error) {
          reject(error);
        }
      });
    });
  };

  // 获取验证码（测试环境使用固定值）
  const getVerificationCode = async (email: string): Promise<string> => {
    console.log('获取验证码 - 环境变量:', {
      VITE_ENV: import.meta.env.VITE_ENV,
      MODE: import.meta.env.MODE
    });
    
    // 测试环境可能使用固定验证码
    if (import.meta.env.VITE_ENV === 'test' || import.meta.env.MODE === 'development') {
      console.log('使用测试环境固定验证码: 123456');
      return '123456'; // 测试环境固定验证码
    }
    
    // 生产环境需要用户输入或自动获取
    // 这里可以根据实际需求实现
    console.log('使用默认固定验证码: 123456');
    return '123456'; // 临时返回固定值
  };

  // 通知APP登录成功
  const notifyAppLoginSuccess = (data: any) => {
    if (window.webkit?.messageHandlers?.loginResult) {
      // iOS WebView
      window.webkit.messageHandlers.loginResult.postMessage({
        type: 'LOGIN_SUCCESS',
        payload: data
      });
    } else if (window.Android?.onLoginResult) {
      // Android WebView
      window.Android.onLoginResult(JSON.stringify({
        type: 'LOGIN_SUCCESS',
        payload: data
      }));
    }
  };

  // 通知APP登录失败
  const notifyAppLoginFailed = (error: any) => {
    if (window.webkit?.messageHandlers?.loginResult) {
      // iOS WebView
      window.webkit.messageHandlers.loginResult.postMessage({
        type: 'LOGIN_FAILED',
        error: error.message || '登录失败'
      });
    } else if (window.Android?.onLoginResult) {
      // Android WebView
      window.Android.onLoginResult(JSON.stringify({
        type: 'LOGIN_FAILED',
        error: error.message || '登录失败'
      }));
    }
  };

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
        
        // 检查URL参数中是否有重定向路径
        const urlParams = new URLSearchParams(window.location.search);
        const redirectPath = urlParams.get('redirect');
        
        if (redirectPath) {
          console.log("Login success, redirecting to:", redirectPath);
          navigate(redirectPath);
        } else {
          // 检查hash中是否有重定向信息（兼容旧逻辑）
          const hash = window.location.hash;
          const redirectMatch = hash.match(/#\/chat\/[^/]+/);
          
          if (redirectMatch) {
            const redirectPath = redirectMatch[0].substring(1); // 移除#号
            console.log("Login success, redirecting to:", redirectPath);
            navigate(redirectPath);
          } else {
            console.log("Login success, redirecting to chat");
            navigate("/chat");
          }
        }
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

  // 如果是隐式登录，显示加载状态
  if (isImplicitLogin && isImplicitLoading) {
    return (
      <div className="implicit-login-container">
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6">
          <div className="text-center">
            <div className="text-lg font-medium text-blue-600 mb-2">正在自动登录中...</div>
            <div className="text-sm text-gray-500">请稍候...</div>
          </div>
        </div>
      </div>
    );
  }

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
            loading={loginLoading || isImplicitLoading}
            size={inputSize}
            className={isH5 ? "h-12 text-base" : ""}
          >
            {isImplicitLogin ? '自动登录中...' : t("placeholder.login")}
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
