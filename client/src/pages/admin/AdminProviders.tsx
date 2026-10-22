import type { ReactNode } from 'react';
import { App, ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { adminTheme } from './adminTheme';

export default function AdminProviders({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider locale={zhCN} theme={adminTheme}>
      <App>{children}</App>
    </ConfigProvider>
  );
}
