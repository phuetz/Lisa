import { ReactNode, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  content: ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface ModernTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
}

export function ModernTabs({
  tabs,
  defaultTab,
  onChange,
  variant = 'default',
}: ModernTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  const variantStyles = {
    default: {
      container: 'bg-[var(--bg-secondary,#2d2d2d)]/50 p-1 rounded-lg',
      button: `
        px-4 py-2 rounded-md transition-all duration-200
        hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))]
      `,
      active: 'bg-[var(--bg-tertiary,#1a1a1a)] shadow-lg',
      inactive: 'text-[var(--text-muted,#666)]',
    },
    pills: {
      container: 'gap-2',
      button: `
        px-4 py-2 rounded-full transition-all duration-200
        hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))] border border-transparent
      `,
      active: 'bg-gradient-to-r from-[var(--color-brand,#10a37f)] to-[var(--color-brand-hover,#0d8c6d)] text-[var(--text-primary,#ececec)] border-transparent',
      inactive: 'text-[var(--text-muted,#666)] border-[var(--border-primary,#424242)]',
    },
    underline: {
      container: 'border-b border-[var(--border-primary,#424242)] gap-6',
      button: `
        px-4 py-3 transition-all duration-200
        border-b-2 border-transparent
      `,
      active: 'border-[var(--color-brand,#10a37f)] text-[var(--color-brand,#10a37f)]',
      inactive: 'text-[var(--text-muted,#666)] hover:text-[var(--text-secondary,#b4b4b4)]',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className={`flex items-center ${styles.container} mb-6`}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              ${styles.button}
              ${activeTab === tab.id ? styles.active : styles.inactive}
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              flex items-center gap-2
            `}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span className="font-medium">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={`
                  px-2 py-0.5 text-xs rounded-full
                  ${activeTab === tab.id
                    ? 'bg-white/20'
                    : 'bg-[var(--color-brand,#10a37f)]/20 text-[var(--color-brand,#10a37f)]'
                  }
                `}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in duration-200">
        {activeTabContent}
      </div>
    </div>
  );
}

interface ModernVerticalTabsProps {
  tabs: Tab[];
  defaultTab?: string;
  onChange?: (tabId: string) => void;
}

export function ModernVerticalTabs({
  tabs,
  defaultTab,
  onChange,
}: ModernVerticalTabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    onChange?.(tabId);
  };

  const activeTabContent = tabs.find((tab) => tab.id === activeTab)?.content;

  return (
    <div className="flex gap-6">
      {/* Sidebar Tabs */}
      <div className="w-64 flex-shrink-0 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && handleTabChange(tab.id)}
            disabled={tab.disabled}
            className={`
              w-full px-4 py-3 rounded-lg transition-all duration-200
              flex items-center gap-3 text-left
              ${activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 border-l-2 border-[var(--color-brand,#10a37f)] text-[var(--text-primary,#ececec)]'
                : 'text-[var(--text-muted,#666)] hover:bg-[var(--bg-hover,rgba(255,255,255,0.06))] border-l-2 border-transparent'
              }
              ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {tab.icon && <span className="text-xl">{tab.icon}</span>}
            <div className="flex-1">
              <span className="font-medium">{tab.label}</span>
            </div>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-[var(--color-brand,#10a37f)]/20 text-[var(--color-brand,#10a37f)]">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 animate-in fade-in duration-200">
        {activeTabContent}
      </div>
    </div>
  );
}
