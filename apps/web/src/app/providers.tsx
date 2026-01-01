import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp, ConfigProvider } from 'antd';
import { ReactNode } from 'react';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useTranslation } from 'react-i18next';

// Initialize i18n
import '../locales';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Map i18n language to Ant Design locale
const antdLocales: Record<string, typeof enUS> = {
  'en-US': enUS,
  'zh-CN': zhCN,
};

export function Providers({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const antdLocale = antdLocales[i18n.language] || enUS;

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider locale={antdLocale}>
        <AntdApp>{children}</AntdApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
