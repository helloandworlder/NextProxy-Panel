import { useState, useEffect, useCallback } from 'react';
import { Tabs, Button, Space, message, Modal } from 'antd';
import { CheckOutlined, FormatPainterOutlined, ImportOutlined } from '@ant-design/icons';
import { JsonEditor } from './JsonEditor';
import type { JsonObject } from '../types/json';
import { useI18n } from '@/hooks/useI18n';

export interface ConfigTemplate {
  name: string;
  nameKey?: string; // i18n key
  description?: string;
  config: JsonObject;
}

interface Props {
  value?: JsonObject;
  onChange?: (value: JsonObject) => void;
  /** Form mode content - render your form fields here */
  formContent?: React.ReactNode;
  /** Available templates for quick import */
  templates?: ConfigTemplate[];
  /** JSON editor height */
  jsonHeight?: number;
  /** Default mode */
  defaultMode?: 'form' | 'json';
  /** Disable mode switching */
  disableModeSwitch?: boolean;
  /** Validate JSON function - return error message or null */
  validateJson?: (json: JsonObject) => string | null;
}

export function DualModeEditor({
  value = {},
  onChange,
  formContent,
  templates = [],
  jsonHeight = 300,
  defaultMode = 'form',
  disableModeSwitch = false,
  validateJson,
}: Props) {
  const { t } = useI18n();
  const [mode, setMode] = useState<'form' | 'json'>(defaultMode);
  const [jsonValue, setJsonValue] = useState<JsonObject>(value);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Sync external value changes
  useEffect(() => {
    setJsonValue(value);
  }, [value]);

  // Handle JSON change from editor
  const handleJsonChange = useCallback((newValue: JsonObject) => {
    setJsonValue(newValue);
    
    // Validate if validator provided
    if (validateJson) {
      const error = validateJson(newValue);
      setJsonError(error);
      if (error) return;
    }
    
    onChange?.(newValue);
  }, [onChange, validateJson]);

  // Validate current JSON
  const handleValidate = useCallback(() => {
    if (validateJson) {
      const error = validateJson(jsonValue);
      setJsonError(error);
      if (error) {
        message.error(error);
      } else {
        message.success(t('editor.jsonValid'));
      }
    } else {
      message.success(t('editor.jsonValid'));
    }
  }, [jsonValue, validateJson, t]);

  // Format JSON
  const handleFormat = useCallback(() => {
    // JsonEditor already formats, just trigger re-render
    setJsonValue({ ...jsonValue });
    message.success(t('common.success'));
  }, [jsonValue, t]);

  // Import template
  const handleImportTemplate = useCallback((template: ConfigTemplate) => {
    setJsonValue(template.config);
    onChange?.(template.config);
    setTemplateModalOpen(false);
    message.success(t('common.success'));
  }, [onChange, t]);

  // Mode switch handler
  const handleModeChange = useCallback((newMode: string) => {
    if (newMode === 'json' && mode === 'form') {
      // Switching to JSON mode - sync current form value
      setJsonValue(value);
    }
    setMode(newMode as 'form' | 'json');
  }, [mode, value]);

  const tabItems = [
    {
      key: 'form',
      label: t('editor.formMode'),
      disabled: disableModeSwitch || !formContent,
      children: formContent || <div className="text-gray-400">{t('common.noData')}</div>,
    },
    {
      key: 'json',
      label: t('editor.jsonMode'),
      disabled: disableModeSwitch,
      children: (
        <div>
          <div className="mb-2 flex justify-end">
            <Space>
              <Button size="small" icon={<CheckOutlined />} onClick={handleValidate}>
                {t('editor.validateJson')}
              </Button>
              <Button size="small" icon={<FormatPainterOutlined />} onClick={handleFormat}>
                {t('editor.formatJson')}
              </Button>
              {templates.length > 0 && (
                <Button size="small" icon={<ImportOutlined />} onClick={() => setTemplateModalOpen(true)}>
                  {t('editor.importTemplate')}
                </Button>
              )}
            </Space>
          </div>
          <JsonEditor
            value={jsonValue}
            onChange={handleJsonChange}
            height={jsonHeight}
          />
          {jsonError && <div className="text-red-500 text-sm mt-1">{jsonError}</div>}
        </div>
      ),
    },
  ];

  return (
    <>
      <Tabs
        activeKey={mode}
        onChange={handleModeChange}
        items={tabItems}
        size="small"
      />

      {/* Template Selection Modal */}
      <Modal
        title={t('editor.selectTemplate')}
        open={templateModalOpen}
        onCancel={() => setTemplateModalOpen(false)}
        footer={null}
        width={500}
      >
        <div className="space-y-2">
          {templates.map((template, index) => (
            <div
              key={index}
              className="p-3 border rounded cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => handleImportTemplate(template)}
            >
              <div className="font-medium">
                {template.nameKey ? t(template.nameKey) : template.name}
              </div>
              {template.description && (
                <div className="text-gray-500 text-sm">{template.description}</div>
              )}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
