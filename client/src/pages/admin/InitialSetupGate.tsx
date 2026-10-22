import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LinkOutlined, ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { App, Button, Card, Input, Modal, Space, Tag, Typography } from 'antd';
import CredentialsPanel from './CredentialsPanel';
import type { AdminOverview } from './types';
import { adminFetch, createRandomEntryPath } from './utils';

export default function InitialSetupGate({
  overview,
  onError,
  onUpdated,
}: {
  overview: AdminOverview;
  onError: (message: string) => void;
  onUpdated: () => void;
}) {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const [entryPathDraft, setEntryPathDraft] = useState(() => {
    if (overview.entryPath && overview.entryPath !== '/admin') return overview.entryPath;
    return createRandomEntryPath();
  });
  const [savingPath, setSavingPath] = useState(false);

  const saveEntryPath = async () => {
    if (savingPath) return;
    const path = entryPathDraft.trim();
    if (path === '/admin') {
      onError('初始设置须使用非 /admin 的随机路径');
      return;
    }
    setSavingPath(true);
    try {
      const res = await adminFetch<{ entryPath: string }>('/api/admin/entry-path', {
        method: 'PUT',
        body: JSON.stringify({ path }),
      });
      message.success('登录地址已保存');
      if (window.location.pathname !== res.entryPath) {
        navigate(res.entryPath, { replace: true });
      }
      onUpdated();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '保存登录地址失败');
    } finally {
      setSavingPath(false);
    }
  };

  return (
    <Modal
      open
      closable={false}
      maskClosable={false}
      footer={null}
      width={560}
      centered
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Space>
          <SafetyCertificateOutlined style={{ fontSize: 20, color: '#faad14' }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            完成初始安全设置
          </Typography.Title>
        </Space>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          首次登录须修改账号密码，并将管理入口改为随机路径。完成前无法使用其它管理功能。
        </Typography.Paragraph>

        {overview.mustChangeCredentials && (
          <CredentialsPanel
            adminUsername={overview.adminUsername || 'admin'}
            persisted={overview.credentialsPersisted ?? false}
            forced
            onError={onError}
            onSaved={onUpdated}
          />
        )}

        {overview.mustChangeEntryPath && (
          <Card
            title={(
              <Space>
                <LinkOutlined />
                <span>登录地址</span>
                <Tag color="warning">必须修改</Tag>
              </Space>
            )}
            size="small"
          >
            <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
              请改成随机路径并收藏；默认 /admin 将无法再作为入口
            </Typography.Paragraph>
            <Space orientation="vertical" style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Typography.Text
                  type="secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 11px',
                    background: '#fafafa',
                    border: '1px solid #d9d9d9',
                    borderRight: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {typeof window !== 'undefined' ? window.location.origin : ''}
                </Typography.Text>
                <Input
                  value={entryPathDraft}
                  onChange={(e) => setEntryPathDraft(e.target.value)}
                  spellCheck={false}
                  suffix={(
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => setEntryPathDraft(createRandomEntryPath())}
                      aria-label="随机生成"
                    />
                  )}
                />
              </Space.Compact>
              <Button
                type="primary"
                onClick={() => void saveEntryPath()}
                loading={savingPath}
                disabled={!entryPathDraft.trim() || entryPathDraft === '/admin'}
              >
                保存地址
              </Button>
            </Space>
          </Card>
        )}
      </Space>
    </Modal>
  );
}
