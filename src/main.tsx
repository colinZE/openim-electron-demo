import "./index.scss";
import "./i18n/index";

import ReactDOM from "react-dom/client";

import App from "./App";
import { Logger } from "./utils/platform";

// 抑制 findDOMNode 警告（Ant Design 5.x 已知问题）
if (process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('findDOMNode is deprecated') || 
       args[0].includes('findDOMNode'))
    ) {
      return; // 抑制 findDOMNode 警告
    }
    originalWarn.apply(console, args);
  };
}

// H5环境统一使用平台适配的日志
// 注意：不要重定向console方法，避免递归调用
// console.debug = Logger.debug;
// console.info = Logger.info;
// console.error = Logger.error;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);

postMessage({ payload: "removeLoading" }, "*");
