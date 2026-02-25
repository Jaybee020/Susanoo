import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Layout from './components/common/Layout';
import OrdersPage from './pages/OrdersPage';
import CreateOrderPage from './pages/CreateOrderPage';
import SwapPage from './pages/SwapPage';
import { FlashMessageProvider } from './contexts/FlashMessageContext';
import { WalletProvider, useWallet } from './contexts/WalletContext';
import { cofheService } from './services/cofheService';

function WalletCofheBridge({ children }: { children: React.ReactNode }) {
  const { signer, provider } = useWallet();

  useEffect(() => {
    if (signer && provider) {
      cofheService.setSigner(signer, provider);
    }
  }, [signer, provider]);

  return <>{children}</>;
}

function App() {
  return (
    <FlashMessageProvider>
      <WalletProvider>
        <WalletCofheBridge>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<OrdersPage />} />
                <Route path="/create" element={<CreateOrderPage />} />
                <Route path="/swap" element={<SwapPage />} />
              </Routes>
            </Layout>
          </Router>
        </WalletCofheBridge>
      </WalletProvider>
    </FlashMessageProvider>
  );
}

export default App;
