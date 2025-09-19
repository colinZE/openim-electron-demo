/**
 * 多标签页检测和状态同步工具
 * 用于检测同一账号的多标签页登录，防止消息串流
 */

interface TabInfo {
  tabId: string;
  timestamp: number;
  conversationId?: string;
  userId?: string;
}

class MultiTabDetector {
  private tabId: string;
  private storageKey = 'openim_active_tabs';
  private checkInterval: NodeJS.Timeout | null = null;
  private onConflictCallback?: (conflictTabs: TabInfo[]) => void;

  constructor() {
    this.tabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.init();
  }

  private init() {
    // 注册当前标签页
    this.registerTab();
    
    // 定期更新心跳和检查冲突
    this.checkInterval = setInterval(() => {
      this.updateHeartbeat();
      this.checkConflicts();
    }, 5000);

    // 页面关闭时清理
    window.addEventListener('beforeunload', () => {
      this.unregisterTab();
    });

    // 监听storage变化
    window.addEventListener('storage', (e) => {
      if (e.key === this.storageKey) {
        this.checkConflicts();
      }
    });

    // 页面可见性变化时检查
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkConflicts();
      }
    });
  }

  private registerTab() {
    const tabs = this.getActiveTabs();
    const currentTab: TabInfo = {
      tabId: this.tabId,
      timestamp: Date.now(),
      userId: this.getCurrentUserId(),
    };

    tabs[this.tabId] = currentTab;
    localStorage.setItem(this.storageKey, JSON.stringify(tabs));
    
    console.log(`🔍 Registered tab: ${this.tabId}`);
  }

  private updateHeartbeat() {
    const tabs = this.getActiveTabs();
    if (tabs[this.tabId]) {
      tabs[this.tabId].timestamp = Date.now();
      tabs[this.tabId].conversationId = this.getCurrentConversationId();
      tabs[this.tabId].userId = this.getCurrentUserId();
      localStorage.setItem(this.storageKey, JSON.stringify(tabs));
    }
  }

  private unregisterTab() {
    const tabs = this.getActiveTabs();
    delete tabs[this.tabId];
    localStorage.setItem(this.storageKey, JSON.stringify(tabs));
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    console.log(`🔍 Unregistered tab: ${this.tabId}`);
  }

  private getActiveTabs(): Record<string, TabInfo> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return {};
      
      const tabs = JSON.parse(stored);
      const now = Date.now();
      const validTabs: Record<string, TabInfo> = {};
      
      // 清理过期的标签页（超过30秒无心跳）
      Object.entries(tabs).forEach(([tabId, tab]) => {
        const tabInfo = tab as TabInfo;
        if (now - tabInfo.timestamp < 30000) {
          validTabs[tabId] = tabInfo;
        }
      });
      
      return validTabs;
    } catch (error) {
      console.error('Failed to parse active tabs:', error);
      return {};
    }
  }

  private getCurrentUserId(): string | undefined {
    try {
      return localStorage.getItem('IM_USERID') || undefined;
    } catch {
      return undefined;
    }
  }

  private getCurrentConversationId(): string | undefined {
    try {
      // 从URL获取当前会话ID
      const hash = window.location.hash;
      const match = hash.match(/\/chat\/(.+)$/);
      return match ? match[1] : undefined;
    } catch {
      return undefined;
    }
  }

  private checkConflicts() {
    const tabs = this.getActiveTabs();
    const currentUserId = this.getCurrentUserId();
    
    if (!currentUserId) return;

    // 查找同一用户的其他活跃标签页
    const conflictTabs = Object.values(tabs).filter(tab => 
      tab.tabId !== this.tabId && 
      tab.userId === currentUserId
    );

    if (conflictTabs.length > 0) {
      console.error('🚨 MULTI-TAB CONFLICT DETECTED!');
      console.error(`Current tab: ${this.tabId}`);
      console.error('Conflicting tabs:', conflictTabs);
      
      // 检查是否有相同的会话页面
      const currentConversationId = this.getCurrentConversationId();
      if (currentConversationId) {
        const sameConversationTabs = conflictTabs.filter(tab => 
          tab.conversationId === currentConversationId
        );
        
        if (sameConversationTabs.length > 0) {
          console.error('🚨 CRITICAL: Multiple tabs open with same conversation!');
          console.error('This WILL cause message routing issues!');
        }
      }

      if (this.onConflictCallback) {
        this.onConflictCallback(conflictTabs);
      }
    }
  }

  public onConflict(callback: (conflictTabs: TabInfo[]) => void) {
    this.onConflictCallback = callback;
  }

  public getTabId(): string {
    return this.tabId;
  }

  public getConflictingTabs(): TabInfo[] {
    const tabs = this.getActiveTabs();
    const currentUserId = this.getCurrentUserId();
    
    if (!currentUserId) return [];

    return Object.values(tabs).filter(tab => 
      tab.tabId !== this.tabId && 
      tab.userId === currentUserId
    );
  }
}

export const multiTabDetector = new MultiTabDetector();

export default MultiTabDetector;
