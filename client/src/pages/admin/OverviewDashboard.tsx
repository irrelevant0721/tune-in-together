import type { CSSProperties, ReactNode } from 'react';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloudServerOutlined,
  DatabaseOutlined,
  ExclamationCircleFilled,
  HddOutlined,
  PlayCircleOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  WifiOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { AdminOverview, MetingUpstreamRecentError, MetingUpstreamStatus } from './types';
import AdminLoading from './AdminLoading';
import { formatUptime } from './utils';

type Props = {
  overview: AdminOverview | null;
  openReportCount: number;
  upstreamBusyUrl: string | null;
  onResetCooldown: (url: string) => void;
  onToggleDisabled: (up: MetingUpstreamStatus) => void;
  onGoReports?: () => void;
};

const METRIC_ICON_WRAP: CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 20,
  flexShrink: 0,
};

function MetricCard({
  title,
  value,
  suffix,
  icon,
  iconBg,
  iconColor,
  hint,
}: {
  title: string;
  value: string | number;
  suffix?: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  hint?: string;
}) {
  return (
    <Card
      variant="borderless"
      styles={{ body: { padding: '20px 22px' } }}
      style={{
        height: '100%',
        borderRadius: 14,
        border: '1px solid rgba(15, 23, 42, 0.06)',
        background: `linear-gradient(160deg, #fff 60%, ${iconBg} 140%)`,
        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.045)',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      className="admin-metric-card"
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, letterSpacing: 0.2 }}>
            {title}
          </Typography.Text>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 4 }}>
            <Typography.Text
              style={{
                fontSize: 30,
                fontWeight: 650,
                lineHeight: 1.1,
                color: '#0f172a',
                letterSpacing: '-0.03em',
              }}
            >
              {value}
            </Typography.Text>
            {suffix && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {suffix}
              </Typography.Text>
            )}
          </div>
          {hint && (
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
              {hint}
            </Typography.Text>
          )}
        </div>
        <div style={{ ...METRIC_ICON_WRAP, background: iconBg, color: iconColor }}>{icon}</div>
      </div>
    </Card>
  );
}

export default function OverviewDashboard({
  overview,
  openReportCount,
  upstreamBusyUrl,
  onResetCooldown,
  onToggleDisabled,
  onGoReports,
}: Props) {
  if (!overview) {
    return (
      <Card style={{ borderRadius: 12, minHeight: 240 }}>
        <AdminLoading tip="加载概览…" minHeight={240} />
      </Card>
    );
  }

  const upstreams = overview.metingUpstreams || [];
  const healthyCount = upstreams.filter((u) => u.healthy && !u.disabled).length;
  const unhealthyCount = upstreams.filter((u) => !u.healthy && !u.disabled).length;
  // 可用率按请求成功率，不因单上游短暂冷却就整表变 0
  const totalOk = upstreams.reduce((sum, u) => sum + (u.okCount || 0), 0);
  const totalHardFail = upstreams.reduce((sum, u) => sum + (u.failCount || 0), 0);
  const hardTotal = totalOk + totalHardFail;
  const healthPct = hardTotal > 0
    ? Math.round((totalOk / hardTotal) * 100)
    : (upstreams.length ? 100 : 100);
  const playPct = overview.roomCount > 0
    ? Math.round((overview.playingRooms / overview.roomCount) * 100)
    : 0;

  const systemOk = overview.redisEnabled && unhealthyCount === 0;
  const systemWarn = !overview.redisEnabled || unhealthyCount > 0 || openReportCount > 0;

  const upstreamColumns: ColumnsType<MetingUpstreamStatus> = [
    {
      title: '状态',
      width: 96,
      render: (_, up) => (
        <Badge
          status={up.disabled ? 'default' : up.healthy ? 'success' : 'error'}
          text={up.disabled ? '已禁用' : up.healthy ? '健康' : '异常'}
        />
      ),
    },
    {
      title: '上游地址',
      dataIndex: 'url',
      ellipsis: true,
      render: (url: string) => (
        <Space size={6} wrap>
          <Typography.Text code style={{ fontSize: 12 }}>{url}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '成功 / 失败',
      width: 140,
      render: (_, up) => (
        <Typography.Text style={{ fontSize: 13 }}>
          <span style={{ color: '#16a34a' }}>{up.okCount}</span>
          <Typography.Text type="secondary"> / </Typography.Text>
          <span style={{ color: up.failCount ? '#dc2626' : undefined }}>{up.failCount}</span>
          {up.softFailCount ? (
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {' '}(+{up.softFailCount} 软)
            </Typography.Text>
          ) : null}
        </Typography.Text>
      ),
    },
    {
      title: '冷却',
      width: 88,
      render: (_, up) => (
        !up.disabled && !up.healthy && up.cooldownRemainingSec > 0
          ? <Tag>{up.cooldownRemainingSec}s</Tag>
          : <Typography.Text type="secondary">—</Typography.Text>
      ),
    },
    {
      title: '操作',
      width: 220,
      fixed: 'right' as const,
      render: (_, up) => (
        <Space size="small">
          <Button
            size="small"
            disabled={upstreamBusyUrl === up.url || up.disabled || up.cooldownRemainingSec <= 0}
            loading={upstreamBusyUrl === up.url}
            onClick={() => onResetCooldown(up.url)}
          >
            重置冷却
          </Button>
          <Button
            size="small"
            type={up.disabled ? 'primary' : 'default'}
            danger={!up.disabled}
            disabled={upstreamBusyUrl === up.url}
            loading={upstreamBusyUrl === up.url}
            onClick={() => onToggleDisabled(up)}
          >
            {up.disabled ? '启 用' : '临时禁用'}
          </Button>
        </Space>
      ),
    },
  ];

  const heroOk = systemOk && !systemWarn;

  return (
    <Space orientation="vertical" size={20} style={{ width: '100%' }}>
      <Card
        variant="borderless"
        styles={{ body: { padding: '24px 26px' } }}
        style={{
          borderRadius: 16,
          overflow: 'hidden',
          background: heroOk
            ? 'linear-gradient(125deg, #0b1220 0%, #12263f 48%, #0f3d5c 100%)'
            : 'linear-gradient(125deg, #1c1408 0%, #3a2710 48%, #4a3214 100%)',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.18)',
          position: 'relative',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse 60% 80% at 100% 0%, rgba(56,189,248,0.18), transparent 55%)',
            pointerEvents: 'none',
          }}
        />
        <Row gutter={[24, 20]} align="middle" style={{ position: 'relative' }}>
          <Col xs={24} lg={14}>
            <Space align="start" size={14}>
              <div
                style={{
                  ...METRIC_ICON_WRAP,
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: heroOk ? 'rgba(34,197,94,0.18)' : 'rgba(251,191,36,0.2)',
                  color: heroOk ? '#4ade80' : '#fbbf24',
                  fontSize: 26,
                  border: `1px solid ${heroOk ? 'rgba(74,222,128,0.35)' : 'rgba(251,191,36,0.35)'}`,
                }}
              >
                {heroOk ? <CheckCircleFilled /> : <ExclamationCircleFilled />}
              </div>
              <div>
                <Typography.Title
                  level={4}
                  style={{ margin: 0, color: '#fff', fontWeight: 650, letterSpacing: '-0.02em' }}
                >
                  {heroOk ? '系统运行正常' : '系统需要关注'}
                </Typography.Title>
                <Typography.Paragraph style={{ margin: '8px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                  已连续运行 {formatUptime(overview.uptimeSec)}
                  {overview.adminUsername ? ` · 当前管理员 ${overview.adminUsername}` : ''}
                </Typography.Paragraph>
                <Space size={8} wrap style={{ marginTop: 12 }}>
                  <Tag
                    icon={<DatabaseOutlined />}
                    style={{
                      margin: 0,
                      border: 'none',
                      background: overview.redisEnabled ? 'rgba(34,197,94,0.2)' : 'rgba(248,113,113,0.2)',
                      color: overview.redisEnabled ? '#86efac' : '#fca5a5',
                    }}
                  >
                    Redis {overview.redisEnabled ? '已连接' : '未连接'}
                  </Tag>
                  <Tag
                    icon={<CloudServerOutlined />}
                    style={{
                      margin: 0,
                      border: 'none',
                      background: 'rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.88)',
                    }}
                  >
                    音源健康 {healthyCount}/{upstreams.length || 0}
                  </Tag>
                  {openReportCount > 0 ? (
                    <Tag
                      style={{
                        margin: 0,
                        border: 'none',
                        background: 'rgba(251,191,36,0.22)',
                        color: '#fde68a',
                        cursor: onGoReports ? 'pointer' : undefined,
                      }}
                      onClick={onGoReports}
                    >
                      待处理上报 {openReportCount}
                    </Tag>
                  ) : (
                    <Tag
                      style={{
                        margin: 0,
                        border: 'none',
                        background: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.55)',
                      }}
                    >
                      无待处理上报
                    </Tag>
                  )}
                </Space>
              </div>
            </Space>
          </Col>
          <Col xs={24} lg={10}>
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: '16px 18px',
              }}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Typography.Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                    房间播放率
                  </Typography.Text>
                  <Progress
                    percent={playPct}
                    strokeColor={{ from: '#38bdf8', to: '#2563eb' }}
                    railColor="rgba(255,255,255,0.12)"
                    style={{ marginTop: 6, marginBottom: 0 }}
                    format={(p) => <span style={{ color: '#fff', fontSize: 12 }}>{p}%</span>}
                  />
                  <Typography.Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    {overview.playingRooms} / {overview.roomCount} 间在播
                  </Typography.Text>
                </Col>
                <Col span={12}>
                  <Typography.Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)' }}>
                    音源可用率
                  </Typography.Text>
                  <Progress
                    percent={healthPct}
                    strokeColor={
                      healthPct >= 80
                        ? { from: '#4ade80', to: '#16a34a' }
                        : { from: '#fbbf24', to: '#d97706' }
                    }
                    railColor="rgba(255,255,255,0.12)"
                    style={{ marginTop: 6, marginBottom: 0 }}
                    format={(p) => <span style={{ color: '#fff', fontSize: 12 }}>{p}%</span>}
                  />
                  <Typography.Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                    {unhealthyCount > 0
                      ? `${unhealthyCount} 个冷却中 · 成功率 ${healthPct}%`
                      : `成功 ${totalOk} / 硬失败 ${totalHardFail}`}
                  </Typography.Text>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 核心指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={12} lg={6}>
          <MetricCard
            title="活跃房间"
            value={overview.roomCount}
            icon={<ThunderboltOutlined />}
            iconBg="#eff6ff"
            iconColor="#2563eb"
            hint={`${overview.playingRooms} 间正在播放`}
          />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard
            title="在线用户"
            value={overview.onlineUsers}
            icon={<TeamOutlined />}
            iconBg="#f0fdf4"
            iconColor="#16a34a"
            hint="当前房内成员合计"
          />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard
            title="播放中"
            value={overview.playingRooms}
            icon={<PlayCircleOutlined />}
            iconBg="#fff7ed"
            iconColor="#ea580c"
            hint={overview.roomCount ? `占比 ${playPct}%` : '暂无房间'}
          />
        </Col>
        <Col xs={12} lg={6}>
          <MetricCard
            title="Socket 连接"
            value={overview.connectedSockets}
            icon={<WifiOutlined />}
            iconBg="#ecfeff"
            iconColor="#0891b2"
            hint="实时长连接数"
          />
        </Col>
      </Row>

      {/* 运行环境 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <MetricCard
            title="运行时长"
            value={formatUptime(overview.uptimeSec)}
            icon={<ClockCircleOutlined />}
            iconBg="#fff7ed"
            iconColor="#ea580c"
          />
        </Col>
        <Col xs={24} sm={8}>
          <MetricCard
            title="进程内存"
            value={overview.memoryRssMb}
            suffix="MB"
            icon={<HddOutlined />}
            iconBg="#f8fafc"
            iconColor="#475569"
            hint="RSS 占用"
          />
        </Col>
        <Col xs={24} sm={8}>
          <MetricCard
            title="持久化"
            value={overview.redisEnabled ? 'Redis' : '内存'}
            icon={<DatabaseOutlined />}
            iconBg={overview.redisEnabled ? '#f0fdf4' : '#fef2f2'}
            iconColor={overview.redisEnabled ? '#16a34a' : '#dc2626'}
            hint={overview.auditStoredIn === 'redis' ? '审计日志已持久化' : '审计仅内存暂存'}
          />
        </Col>
      </Row>

      {/* 音源上游 */}
      {upstreams.length > 0 && (
        <Card
          variant="borderless"
          title={(
            <Space size={10}>
              <CloudServerOutlined style={{ color: '#2563eb' }} />
              <span>Meting 音源上游</span>
              <Tag color={healthPct >= 80 ? 'success' : 'warning'}>
                {healthyCount}/{upstreams.length} 健康
              </Tag>
            </Space>
          )}
          style={{
            borderRadius: 12,
            boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 16px rgba(15, 23, 42, 0.04)',
          }}
        >
          <Table
            rowKey="url"
            size="middle"
            columns={upstreamColumns}
            dataSource={upstreams}
            pagination={upstreams.length > 10 ? { pageSize: 10, showSizeChanger: false } : false}
            scroll={{ x: 700 }}
            expandable={{
              expandedRowRender: (up) => {
                const errors: MetingUpstreamRecentError[] = up.recentErrors?.length
                  ? up.recentErrors
                  : (up.lastError
                    ? [{ at: up.lastErrorAt || 0, message: up.lastError, type: '', id: '', server: '' }]
                    : []);
                if (errors.length === 0) return null;
                return (
                  <Space orientation="vertical" size={6} style={{ width: '100%' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      最近失败记录（最多 {errors.length} 条）
                    </Typography.Text>
                    {errors.map((err, index) => (
                      <Typography.Text
                        key={`${err.at}-${index}`}
                        type="danger"
                        style={{ fontSize: 12, display: 'block' }}
                      >
                        {err.at
                          ? `${new Date(err.at).toLocaleString()} · `
                          : ''}
                        {err.roomId || err.roomName
                          ? `房间 ${err.roomName || err.roomId}`
                            + (err.roomId && err.roomName ? ` (${err.roomId})` : '')
                            + ' · '
                          : ''}
                        {err.userNickname || err.userId
                          ? `用户 ${err.userNickname || err.userId} · `
                          : ''}
                        {err.clientIp ? `IP ${err.clientIp} · ` : ''}
                        {err.server || err.type
                          ? `[${[err.server, err.type, err.id].filter(Boolean).join(' / ')}] `
                          : ''}
                        {err.message}
                      </Typography.Text>
                    ))}
                  </Space>
                );
              },
              rowExpandable: (up) => Boolean(up.lastError || up.recentErrors?.length),
            }}
          />
        </Card>
      )}
    </Space>
  );
}
