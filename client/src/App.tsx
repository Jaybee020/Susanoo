import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/common/Layout';
import OrdersPage from './pages/OrdersPage';
import CreateOrderPage from './pages/CreateOrderPage';
import { FlashMessageProvider } from './contexts/FlashMessageContext';

function App() {
  return (
    <FlashMessageProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<OrdersPage />} />
            <Route path="/create" element={<CreateOrderPage />} />
          </Routes>
        </Layout>
      </Router>
    </FlashMessageProvider>
  );
}

export default App;