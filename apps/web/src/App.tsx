import { ConfigProvider } from 'antd';
import { BrowserRouter } from 'react-router-dom';
import { Providers } from './app/providers';
import { AppRoutes } from './app/routes';

function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677ff',
        },
      }}
    >
      <BrowserRouter>
        <Providers>
          <AppRoutes />
        </Providers>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
