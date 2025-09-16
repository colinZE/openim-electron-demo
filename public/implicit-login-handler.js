// 隐式登录处理器
(function() {
    'use strict';
    
    // 检查是否有隐式登录数据
    function checkImplicitLogin() {
        // 从 sessionStorage 获取数据（更安全）
        const loginData = sessionStorage.getItem('implicitLoginData');
        if (loginData) {
            try {
                const data = JSON.parse(loginData);
                console.log('检测到隐式登录数据:', data);
                
                // 设置全局变量
                window.implicitLoginData = data;
                
                // 清除 sessionStorage
                sessionStorage.removeItem('implicitLoginData');
                
                // 跳转到登录页面
                window.location.href = '/#/login?implicit=true';
            } catch (error) {
                console.error('解析隐式登录数据失败:', error);
                window.location.href = '/#/login';
            }
        }
    }
    
    // 页面加载时检查
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkImplicitLogin);
    } else {
        checkImplicitLogin();
    }
})();
