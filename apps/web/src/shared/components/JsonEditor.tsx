import { Input } from 'antd';
import { useState, useEffect } from 'react';
import type { JsonObject } from '../types/json';

interface Props {
  value?: JsonObject;
  onChange?: (value: JsonObject) => void;
  placeholder?: string;
  rows?: number;
  height?: number;
}

export function JsonEditor({ value, onChange, placeholder = '{}', rows = 8, height }: Props) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setText(value ? JSON.stringify(value, null, 2) : '');
  }, [value]);

  const handleChange = (newText: string) => {
    setText(newText);
    if (!newText.trim()) {
      setError(null);
      onChange?.({});
      return;
    }
    try {
      const parsed = JSON.parse(newText);
      setError(null);
      onChange?.(parsed);
    } catch {
      setError('Invalid JSON');
    }
  };

  const style = height ? { height } : undefined;

  return (
    <div>
      <Input.TextArea
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="font-mono text-sm"
        status={error ? 'error' : undefined}
        style={style}
      />
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
    </div>
  );
}
