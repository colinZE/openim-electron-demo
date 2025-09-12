import "./index.scss";
import "./i18n/index";

import ReactDOM from "react-dom/client";

import App from "./App";
import { Logger } from "./utils/platform";

// H5环境统一使用平台适配的日志
// 注意：不要重定向console方法，避免递归调用
// console.debug = Logger.debug;
// console.info = Logger.info;
// console.error = Logger.error;

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(<App />);

postMessage({ payload: "removeLoading" }, "*");
