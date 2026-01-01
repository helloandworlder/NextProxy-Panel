import { Dropdown, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';
import { useI18n } from '../../hooks/useI18n';
import type { SupportedLanguage } from '../../locales';

export function LanguageSwitcher() {
  const { currentLanguage, setLanguage, supportedLanguages } = useI18n();

  const items = supportedLanguages.map((lang) => ({
    key: lang.code,
    label: lang.nativeName,
    onClick: () => setLanguage(lang.code as SupportedLanguage),
  }));

  const currentLang = supportedLanguages.find((l) => l.code === currentLanguage);

  return (
    <Dropdown menu={{ items, selectedKeys: [currentLanguage] }} placement="bottomRight">
      <Button type="text" icon={<GlobalOutlined />}>
        {currentLang?.nativeName || 'English'}
      </Button>
    </Dropdown>
  );
}
