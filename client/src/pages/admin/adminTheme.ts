import type { ThemeConfig } from 'antd';

export const adminTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    colorBgLayout: '#f5f7fa',
    colorBorderSecondary: '#f0f0f0',
    borderRadius: 8,
    fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif`,
  },
  components: {
    Layout: {
      siderBg: '#fff',
      headerBg: '#fff',
      bodyBg: '#f5f7fa',
    },
    Menu: {
      itemSelectedBg: '#e6f4ff',
      itemSelectedColor: '#1677ff',
      itemHoverBg: '#f5f7fa',
    },
    Card: {
      headerFontSize: 15,
    },
    Table: {
      headerBg: '#fafafa',
      cellPaddingBlock: 14,
      cellPaddingInline: 16,
    },
  },
};
