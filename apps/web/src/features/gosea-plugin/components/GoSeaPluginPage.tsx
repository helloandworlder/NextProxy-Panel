import { useState } from 'react';
import { Tabs } from 'antd';
import { DatabaseOutlined, PieChartOutlined, ShareAltOutlined, SwapOutlined } from '@ant-design/icons';
import { PoolTab } from './PoolTab';
import { InventoryTab } from './InventoryTab';
import { AllocationsTab } from './AllocationsTab';
import { RelaysTab } from './RelaysTab';

export function GoSeaPluginPage() {
  const [activeTab, setActiveTab] = useState('pool');

  const items = [
    { key: 'pool', label: <span><DatabaseOutlined /> Socks5 Pool</span>, children: <PoolTab /> },
    { key: 'inventory', label: <span><PieChartOutlined /> Inventory</span>, children: <InventoryTab /> },
    { key: 'allocations', label: <span><ShareAltOutlined /> Allocations</span>, children: <AllocationsTab /> },
    { key: 'relays', label: <span><SwapOutlined /> Relays</span>, children: <RelaysTab /> },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">GoSea Plugin</h1>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={items} />
    </div>
  );
}
