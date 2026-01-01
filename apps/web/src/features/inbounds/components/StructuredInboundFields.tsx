import { Form, Input, Select, Switch, Collapse, Space } from 'antd';
import { useI18n } from '@/hooks/useI18n';

const { Panel } = Collapse;

// Security types
const SECURITY_TYPES = ['none', 'tls', 'reality'] as const;

// Transport types
const TRANSPORT_TYPES = ['tcp', 'ws', 'grpc', 'h2', 'quic', 'kcp'] as const;

// Sniffing dest override options
const SNIFFING_DEST_OPTIONS = ['http', 'tls', 'quic', 'fakedns'];

interface Props {
  /** Current protocol value */
  protocol?: string;
  /** Node capabilities (if available) */
  capabilities?: {
    transports?: string[];
    features?: string[];
  };
}

/**
 * Security configuration form fields
 */
export function SecurityFields(_props: { protocol?: string }) {
  const { t } = useI18n();
  const securityType = Form.useWatch('securityType');

  return (
    <Collapse size="small" className="mb-4">
      <Panel header={t('inbounds.security')} key="security">
        <Form.Item name="securityType" label={t('inbounds.securityType')} initialValue="none">
          <Select>
            {SECURITY_TYPES.map((s) => (
              <Select.Option key={s} value={s}>
                {s.toUpperCase()}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {securityType === 'tls' && <TlsFields />}
        {securityType === 'reality' && <RealityFields />}
      </Panel>
    </Collapse>
  );
}

/**
 * TLS configuration fields
 */
function TlsFields() {
  const { t } = useI18n();
  return (
    <div className="pl-4 border-l-2 border-blue-200">
      <Form.Item name="tlsServerName" label={t('inbounds.tlsServerName')}>
        <Input placeholder="example.com" />
      </Form.Item>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="tlsCertPath" label={t('inbounds.tlsCertPath')}>
          <Input placeholder="/path/to/cert.pem" />
        </Form.Item>
        <Form.Item name="tlsKeyPath" label={t('inbounds.tlsKeyPath')}>
          <Input placeholder="/path/to/key.pem" />
        </Form.Item>
      </div>
    </div>
  );
}

/**
 * Reality configuration fields
 */
function RealityFields() {
  const { t } = useI18n();
  return (
    <div className="pl-4 border-l-2 border-purple-200">
      <Form.Item name="realityDest" label={t('inbounds.realityDest')} rules={[{ required: true }]}>
        <Input placeholder="www.microsoft.com:443" />
      </Form.Item>
      <Form.Item name="realityServerNames" label={t('inbounds.realityServerNames')}>
        <Select mode="tags" placeholder={t('inbounds.realityServerNamesPlaceholder')} />
      </Form.Item>
      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="realityPrivateKey" label={t('inbounds.realityPrivateKey')}>
          <Input.Password placeholder="Generate with: xray x25519" />
        </Form.Item>
        <Form.Item name="realityShortIds" label={t('inbounds.realityShortIds')}>
          <Select mode="tags" placeholder="e.g., 0123456789abcdef" />
        </Form.Item>
      </div>
    </div>
  );
}

/**
 * Transport configuration form fields
 */
export function TransportFields({ capabilities }: Props) {
  const { t } = useI18n();
  const transportType = Form.useWatch('transportType');
  
  const availableTransports = capabilities?.transports || TRANSPORT_TYPES;

  return (
    <Collapse size="small" className="mb-4">
      <Panel header={t('inbounds.transport')} key="transport">
        <Form.Item name="transportType" label={t('inbounds.transportType')} initialValue="tcp">
          <Select>
            {availableTransports.map((t) => (
              <Select.Option key={t} value={t}>
                {t.toUpperCase()}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {transportType === 'ws' && <WsFields />}
        {transportType === 'grpc' && <GrpcFields />}
        {transportType === 'h2' && <H2Fields />}
      </Panel>
    </Collapse>
  );
}

/**
 * WebSocket transport fields
 */
function WsFields() {
  const { t } = useI18n();
  return (
    <div className="pl-4 border-l-2 border-green-200">
      <div className="grid grid-cols-2 gap-4">
        <Form.Item name="wsPath" label={t('inbounds.wsPath')}>
          <Input placeholder="/ws" />
        </Form.Item>
        <Form.Item name="wsHost" label={t('inbounds.wsHost')}>
          <Input placeholder="example.com" />
        </Form.Item>
      </div>
    </div>
  );
}

/**
 * gRPC transport fields
 */
function GrpcFields() {
  const { t } = useI18n();
  return (
    <div className="pl-4 border-l-2 border-yellow-200">
      <Form.Item name="grpcServiceName" label={t('inbounds.grpcServiceName')}>
        <Input placeholder="grpc" />
      </Form.Item>
    </div>
  );
}

/**
 * HTTP/2 transport fields
 */
function H2Fields() {
  const { t } = useI18n();
  return (
    <div className="pl-4 border-l-2 border-orange-200">
      <Form.Item name="h2Path" label={t('inbounds.h2Path')}>
        <Input placeholder="/h2" />
      </Form.Item>
    </div>
  );
}

/**
 * Sniffing configuration form fields
 */
export function SniffingFields() {
  const { t } = useI18n();
  const sniffingEnabled = Form.useWatch('sniffingEnabled');

  return (
    <Collapse size="small" className="mb-4">
      <Panel header={t('inbounds.sniffing')} key="sniffing">
        <Form.Item name="sniffingEnabled" label={t('inbounds.sniffingEnabled')} valuePropName="checked" initialValue={true}>
          <Switch />
        </Form.Item>

        {sniffingEnabled && (
          <div className="pl-4 border-l-2 border-gray-200">
            <Form.Item name="sniffingDestOverride" label={t('inbounds.sniffingDestOverride')} initialValue={['http', 'tls']}>
              <Select mode="multiple">
                {SNIFFING_DEST_OPTIONS.map((opt) => (
                  <Select.Option key={opt} value={opt}>{opt}</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="sniffingRouteOnly" label={t('inbounds.sniffingRouteOnly')} valuePropName="checked" initialValue={false}>
              <Switch />
            </Form.Item>
          </div>
        )}
      </Panel>
    </Collapse>
  );
}

/**
 * Combined structured form fields component
 */
export function StructuredInboundFields(props: Props) {
  return (
    <Space direction="vertical" className="w-full">
      <SecurityFields protocol={props.protocol} />
      <TransportFields capabilities={props.capabilities} />
      <SniffingFields />
    </Space>
  );
}
