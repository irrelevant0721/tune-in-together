import { Spin } from 'antd';

interface Props {
  tip?: string;
  size?: 'small' | 'default' | 'large';
  /** 占位高度，便于在卡片/弹窗内垂直居中 */
  minHeight?: number | string;
}

/** 管理后台统一居中加载态 */
export default function AdminLoading({ tip, size = 'large', minHeight = 240 }: Props) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        minHeight,
      }}
    >
      <Spin size={size} description={tip} />
    </div>
  );
}
