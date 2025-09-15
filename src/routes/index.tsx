import { createHashRouter } from "react-router-dom";

import { MainContentLayout } from "@/layout/MainContentLayout";
import { MainContentWrap } from "@/layout/MainContentWrap";
import { EmptyChat } from "@/pages/chat/EmptyChat";
import { QueryChat } from "@/pages/chat/queryChat";

import contactRoutes from "./ContactRoutes";
import GlobalErrorElement from "./GlobalErrorElement";

const router = createHashRouter([
  {
    path: "/",
    element: <MainContentWrap />,
    errorElement: <GlobalErrorElement />,
    children: [
      {
        path: "/",
        element: <MainContentLayout />,
        children: [
          {
            path: "/chat",
            async lazy() {
              const { Chat } = await import("@/pages/chat");
              return { Component: Chat };
            },
            children: [
              {
                path: ":conversationID",
                element: <QueryChat />,
              },
              {
                index: true,
                element: <EmptyChat />,
              },
            ],
          },
          {
            path: "/contact",
            async lazy() {
              const { Contact } = await import("@/pages/contact");
              return { Component: Contact };
            },
            children: contactRoutes,
          },
          {
            path: "/profile",
            async lazy() {
              const { default: Profile } = await import("@/pages/profile");
              return { Component: Profile };
            },
          },
          {
            path: "/settings",
            async lazy() {
              const { default: Settings } = await import("@/pages/settings");
              return { Component: Settings };
            },
          },
        ],
      },
      {
        path: "login",
        async lazy() {
          const { Login } = await import("@/pages/login");
          return { Component: Login };
        },
      },
    ],
  },
]);

export default router;
