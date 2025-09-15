# 隐式登录调试指南

## 问题描述

隐式登录能访问页面，输入账号密码，登录按钮变为"自动登录中"，但没有真正登录，点击登录后通讯录页面为空白。

## 调试步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具，查看控制台输出，应该能看到以下日志：

```
检测到APP隐式登录请求
使用URL参数方式登录（测试环境）
开始隐式登录流程: {email: "user@example.com", password: "123456", areaCode: "+86"}
发送验证码...
验证码发送成功
获取验证码...
获取验证码 - 环境变量: {VITE_ENV: undefined, MODE: "development"}
使用测试环境固定验证码: 123456
获取到验证码: 123456
开始执行登录...
```

### 2. 检查网络请求

在开发者工具的Network标签页中，查看是否有以下请求：

1. **发送验证码请求**：
   - URL: `/account/code/send`
   - Method: POST
   - Status: 200

2. **登录请求**：
   - URL: `/account/login`
   - Method: POST
   - Status: 200

### 3. 检查登录响应

登录请求的响应应该包含：
```json
{
  "code": 0,
  "data": {
    "chatToken": "xxx",
    "imToken": "xxx",
    "userID": "xxx"
  }
}
```

### 4. 测试URL

使用以下URL进行测试：
```
http://localhost:5173/#/login?email=test@example.com&password=123456&implicit=true
```

## 可能的问题和解决方案

### 问题1：验证码发送失败

**症状**：控制台显示"验证码发送失败"
**解决方案**：
1. 检查网络连接
2. 检查API地址是否正确
3. 检查邮箱格式是否正确

### 问题2：登录API调用失败

**症状**：控制台显示"登录失败"
**解决方案**：
1. 检查登录API的响应
2. 检查验证码是否正确
3. 检查账号密码是否正确

### 问题3：SDK初始化失败

**症状**：登录成功但通讯录页面空白
**解决方案**：
1. 检查SDK是否正确初始化
2. 检查连接状态是否正确设置
3. 检查用户信息是否正确存储

## 调试代码

如果问题仍然存在，可以在浏览器控制台中运行以下代码来手动测试：

```javascript
// 手动触发隐式登录
const testImplicitLogin = () => {
  const credentials = {
    email: 'test@example.com',
    password: '123456',
    areaCode: '+86'
  };
  
  // 模拟URL参数
  const params = new URLSearchParams();
  params.set('email', credentials.email);
  params.set('password', credentials.password);
  params.set('areaCode', credentials.areaCode);
  params.set('implicit', 'true');
  
  // 更新URL
  window.location.hash = `#/login?${params.toString()}`;
};

// 运行测试
testImplicitLogin();
```

## 常见错误

### 1. 验证码错误
```
Error: 验证码错误
```
**解决方案**：确保使用正确的验证码（测试环境使用123456）

### 2. 账号密码错误
```
Error: 账号或密码错误
```
**解决方案**：检查账号密码是否正确

### 3. 网络错误
```
Error: Network Error
```
**解决方案**：检查网络连接和API地址

## 联系支持

如果问题仍然存在，请提供以下信息：
1. 浏览器控制台的完整日志
2. Network标签页中的请求和响应
3. 使用的测试URL
4. 浏览器版本和操作系统信息
