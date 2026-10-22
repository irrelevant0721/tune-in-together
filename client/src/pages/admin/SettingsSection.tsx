import type { ReactNode } from 'react';
import { Col, Row, Typography } from 'antd';

export default function SettingsSection({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Row gutter={[40, 16]} style={{ padding: '24px 0' }}>
      <Col xs={24} md={8} lg={6}>
        <Typography.Text strong style={{ fontSize: 14 }}>
          {title}
          {badge ? <> {badge}</> : null}
        </Typography.Text>
        {description && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
            {description}
          </Typography.Paragraph>
        )}
      </Col>
      <Col xs={24} md={16} lg={18}>
        {children}
      </Col>
    </Row>
  );
}
