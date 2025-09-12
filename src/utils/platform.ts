/**
 * 平台检测和适配工具
 */

export const Platform = {
  /**
   * 检测是否为Electron环境
   */
  isElectron: (): boolean => {
    return !!(window as any).electronAPI;
  },

  /**
   * 检测是否为移动端
   */
  isMobile: (): boolean => {
    return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  },

  /**
   * 检测是否为H5环境
   */
  isH5: (): boolean => {
    return !(window as any).electronAPI;
  },

  /**
   * 获取平台类型
   */
  getPlatformType: (): 'electron' | 'h5' => {
    return Platform.isElectron() ? 'electron' : 'h5';
  },

  /**
   * 获取设备类型
   */
  getDeviceType: (): 'mobile' | 'desktop' => {
    return Platform.isMobile() ? 'mobile' : 'desktop';
  }
};

/**
 * 日志工具 - 适配不同平台
 */
export const Logger = {
  debug: (...args: any[]) => {
    // 使用原始的console方法，避免递归调用
    if (typeof window !== 'undefined' && window.console) {
      window.console.debug(...args);
    }
  },

  info: (...args: any[]) => {
    if (typeof window !== 'undefined' && window.console) {
      window.console.info(...args);
    }
  },

  error: (...args: any[]) => {
    if (typeof window !== 'undefined' && window.console) {
      window.console.error(...args);
    }
  }
};

/**
 * 存储工具 - 适配不同平台
 */
export const Storage = {
  /**
   * 获取存储值
   */
  get: async (key: string): Promise<string | null> => {
    if (Platform.isElectron()) {
      try {
        return await (window as any).electronAPI?.ipcInvoke('getKeyStore', { key });
      } catch {
        return localStorage.getItem(key);
      }
    } else {
      return localStorage.getItem(key);
    }
  },

  /**
   * 设置存储值
   */
  set: async (key: string, value: string): Promise<void> => {
    if (Platform.isElectron()) {
      try {
        await (window as any).electronAPI?.ipcInvoke('setKeyStore', { key, value });
      } catch {
        localStorage.setItem(key, value);
      }
    } else {
      localStorage.setItem(key, value);
    }
  },

  /**
   * 删除存储值
   */
  remove: async (key: string): Promise<void> => {
    if (Platform.isElectron()) {
      try {
        await (window as any).electronAPI?.ipcInvoke('removeKeyStore', { key });
      } catch {
        localStorage.removeItem(key);
      }
    } else {
      localStorage.removeItem(key);
    }
  }
};

/**
 * 文件操作工具 - 适配不同平台
 */
export const FileUtils = {
  /**
   * 下载文件
   */
  download: (url: string, filename?: string): void => {
    if (Platform.isElectron()) {
      // Electron环境使用原生下载
      try {
        (window as any).electronAPI?.ipcInvoke('downloadFile', { url, filename });
      } catch {
        // 降级到浏览器下载
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || '';
        link.click();
      }
    } else {
      // H5环境使用浏览器下载
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || '';
      link.click();
    }
  },

  /**
   * 选择文件
   */
  selectFile: (accept?: string): Promise<FileList | null> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      if (accept) input.accept = accept;
      input.onchange = (e) => {
        const target = e.target as HTMLInputElement;
        resolve(target.files);
      };
      input.click();
    });
  }
};

/**
 * 通知工具 - 适配不同平台
 */
export const Notification = {
  /**
   * 显示通知
   */
  show: (title: string, body?: string, icon?: string): void => {
    if (Platform.isElectron()) {
      try {
        (window as any).electronAPI?.ipcInvoke('showNotification', { title, body, icon });
      } catch {
        // 降级到Web通知
        if ('Notification' in window && window.Notification.permission === 'granted') {
          new window.Notification(title, { body, icon });
        }
      }
    } else {
      // H5环境使用Web通知
      if ('Notification' in window) {
        if (window.Notification.permission === 'granted') {
          new window.Notification(title, { body, icon });
        } else if (window.Notification.permission !== 'denied') {
          window.Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new window.Notification(title, { body, icon });
            }
          });
        }
      }
    }
  },

  /**
   * 请求通知权限
   */
  requestPermission: (): Promise<NotificationPermission> => {
    if (Platform.isElectron()) {
      return Promise.resolve('granted');
    } else {
      if ('Notification' in window) {
        return Notification.requestPermission();
      }
      return Promise.resolve('denied');
    }
  }
};
