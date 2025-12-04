'use client';
import { useState, useEffect, useCallback } from 'react';
import TopBar from '@/components/topbar';
import { useRouter } from 'next/navigation';

interface PortfolioItem {
  symbol: string;
  name: string | null;
  quantity: number;
  avgPrice: string;
  currentPrice: string;
  invested: string;
  currentValue: string;
  unrealizedPnl: string;
  pnlPercentage: string;
  createdAt: string;
}

interface PortfolioData {
  balance: string;
  totalInvested: string;
  totalPortfolioValue: string;
  totalUnrealizedPnl: string;
  totalPnlPercentage: string;
  totalAccountValue: string;
  portfolio: PortfolioItem[];
}

export default function Portfolio() {
  const router = useRouter();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolio = useCallback(async () => {
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
      setPortfolioData(data);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

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

  const formatCurrency = (value: string): string => {
    return parseFloat(value).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatPercentage = (value: string): string => {
    const numValue = parseFloat(value);
    return `${numValue >= 0 ? '+' : ''}${numValue.toFixed(2)}%`;
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

  if (!portfolioData) {
    return (
      <div className="min-h-screen bg-[#111418] flex items-center justify-center">
        <span className="text-white text-xl">No data available</span>
      </div>
    );
  }

  const totalPnlIsPositive = parseFloat(portfolioData.totalUnrealizedPnl) >= 0;

  return (
    <div className="min-h-screen bg-[#111418]">
      <TopBar />
      <div className="p-4 md:p-10">
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#181B20] text-white rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-2">Cash Balance</p>
              <p className="text-3xl font-semibold">{formatCurrency(portfolioData.balance)}</p>
            </div>

            <div className="bg-[#181B20] text-white rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-2">Total Invested</p>
              <p className="text-3xl font-semibold">{formatCurrency(portfolioData.totalInvested)}</p>
            </div>

            <div className="bg-[#181B20] text-white rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-2">Portfolio Value</p>
              <p className="text-3xl font-semibold">{formatCurrency(portfolioData.totalPortfolioValue)}</p>
            </div>

            <div className="bg-[#181B20] text-white rounded-2xl p-6">
              <p className="text-gray-400 text-sm mb-2">Total Account Value</p>
              <p className="text-3xl font-semibold">{formatCurrency(portfolioData.totalAccountValue)}</p>
            </div>
          </div>

          <div className="bg-[#181B20] text-white rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-2">Total Unrealized P&L</p>
                <p className={`text-4xl font-bold ${totalPnlIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {formatCurrency(portfolioData.totalUnrealizedPnl)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm mb-2">Return</p>
                <p className={`text-4xl font-bold ${totalPnlIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                  {formatPercentage(portfolioData.totalPnlPercentage)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#181B20] text-white rounded-2xl p-6 overflow-x-auto">
            <h2 className="text-2xl font-semibold mb-6">Holdings</h2>
            <table className="text-left w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#23262A]">
                  <th className="py-3 px-4">Symbol</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4 text-right">Quantity</th>
                  <th className="py-3 px-4 text-right">Avg. Price</th>
                  <th className="py-3 px-4 text-right">Current Price</th>
                  <th className="py-3 px-4 text-right">Invested</th>
                  <th className="py-3 px-4 text-right">Current Value</th>
                  <th className="py-3 px-4 text-right">P&L</th>
                  <th className="py-3 px-4 text-right">P&L %</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {portfolioData.portfolio.length > 0 ? (
                  portfolioData.portfolio.map((item) => {
                    const pnlIsPositive = parseFloat(item.unrealizedPnl) >= 0;
                    return (
                      <tr key={item.symbol} className="border-t border-[#23262A] hover:bg-[#1F2229]">
                        <td className="py-4 px-4 font-semibold">{item.symbol}</td>
                        <td className="py-4 px-4 text-gray-400">{item.name || '-'}</td>
                        <td className="py-4 px-4 text-right">{item.quantity}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(item.avgPrice)}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(item.currentPrice)}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(item.invested)}</td>
                        <td className="py-4 px-4 text-right">{formatCurrency(item.currentValue)}</td>
                        <td className={`py-4 px-4 text-right font-semibold ${pnlIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {formatCurrency(item.unrealizedPnl)}
                        </td>
                        <td className={`py-4 px-4 text-right font-semibold ${pnlIsPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {formatPercentage(item.pnlPercentage)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <button
                            onClick={() => handleSell(item.symbol, item.quantity)}
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded transition-colors"
                          >
                            Sell
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-gray-400">
                      You have no holdings. Start trading to see your portfolio here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}