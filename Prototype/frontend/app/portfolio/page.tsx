'use client';
import { useState, useEffect } from 'react';
import TopBar from '@/components/topbar';
import { useRouter } from 'next/navigation';

interface PortfolioItem {
  stock: {
    symbol: string;
  };
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
}

export default function Portfolio() {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(0);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = async () => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/');
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/trades/portfolio', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch portfolio data.');
      }

      const data = await response.json();
      setBalance(data.balance);
      setPortfolio(data.portfolio);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const handleSell = async (symbol: string, currentQuantity: number) => {
    const quantityToSell = prompt(`How many shares of ${symbol} do you want to sell? (You own ${currentQuantity})`);
    if (!quantityToSell || isNaN(Number(quantityToSell)) || Number(quantityToSell) <= 0) {
      alert('Please enter a valid quantity.');
      return;
    }

    const quantity = Number(quantityToSell);
    if (quantity > currentQuantity) {
      alert('You cannot sell more shares than you own.');
      return;
    }

    const token = localStorage.getItem('access_token');
    try {
      const response = await fetch('http://localhost:3001/trades/sell', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ symbol, quantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sell stock.');
      }

      alert('Stock sold successfully!');
      setLoading(true);
      fetchPortfolio();
    } catch (err: unknown) {
      alert(`Error selling stock: ${(err as Error).message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#111418] flex items-center justify-center">
        <span className="text-white text-xl">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#111418] flex items-center justify-center">
        <span className="text-red-500 text-xl">{error}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111418]">
      <TopBar />
      <div id="container" className="flex justify-center gap-10 mt-10 p-4 md:p-10 flex-wrap">
        <div className="bg-[#181B20] text-white rounded-3xl flex flex-col w-full md:w-96 p-7 gap-4">
          <h1 className="font-semibold text-3xl mb-6">Portfolio</h1>
          <h2>Total Balance</h2>
          <h3 className="text-5xl mb-10">
            {balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </h3>
        </div>
        <div className="bg-[#181B20] text-white rounded-3xl flex flex-col flex-grow p-7 gap-4 overflow-x-auto">
          <h1 className="font-semibold text-3xl mb-6">Holdings</h1>
          <table className="text-left w-full">
            <thead>
              <tr className="border-b border-[#23262A]">
                <th className="py-3 px-4">Symbol</th>
                <th className="py-3 px-4">Shares</th>
                <th className="py-3 px-4">Avg. Price</th>
                <th className="py-3 px-4">Current</th>
                <th className="py-3 px-4">P/L</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {portfolio.length > 0 ? (
                portfolio.map((item) => (
                  <tr key={item.stock.symbol} className="border-t border-[#23262A]">
                    <td className="py-4 px-4">{item.stock.symbol}</td>
                    <td className="py-4 px-4">{item.quantity}</td>
                    <td className="py-4 px-4">{item.avgPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className="py-4 px-4">{item.currentPrice.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</td>
                    <td className={`py-4 px-4 ${item.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {item.pnl.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleSell(item.stock.symbol, item.quantity)}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Sell
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-10">
                    You have no holdings.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}