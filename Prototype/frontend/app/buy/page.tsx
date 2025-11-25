"use client";
import React, { useState, useEffect } from "react";
import TopBar from '@/components/topbar';

interface Tick {
  price: number;
  change: number;
}

interface StockData {
  symbol: string;
  name?: string;
  marketType?: string;
  tick?: Tick;
}

export default function BuyPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
  
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
  const [showBuyPanel, setShowBuyPanel] = useState<boolean>(false);
  const [quantity, setQuantity] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    fetchAllStocks();
  }, []);

  useEffect(() => {
    if (selectedStock && quantity > 0) {
      setTotalPrice(getPrice(selectedStock.tick) * quantity);
    } else {
      setTotalPrice(0);
    }
  }, [selectedStock, quantity]);

  const fetchAllStocks = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/stocks/featured`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stocks');
      }

      const data = await response.json();

      setStocks(data);
    } catch (err) {
      setError('Failed to load stocks');
      console.error('Error fetching stocks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockSelect = (stock: StockData): void => {
    setSelectedStock(stock);
    setShowBuyPanel(true);
    setQuantity(0);
    setTotalPrice(0);
  };

  const handleQuantityChange = (value: string): void => {
    const numValue = parseInt(value) || 0;
    setQuantity(numValue);
  };

  const handleBuySubmit = async (): Promise<void> => {
    if (!selectedStock || quantity <= 0 || isSubmitting) {
        return;
    }

    try {
        setIsSubmitting(true);
        
        const response = await fetch(`${API_BASE}/trades/buy`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            symbol: selectedStock.symbol,
            quantity: quantity,
        }),
        });

        if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to place buy order');
        }

        const result = await response.json();
        console.log('Buy order successful:', result);
        
        alert(`Successfully bought ${quantity} shares of ${selectedStock.symbol}!`);
        
        closeBuyPanel();
    } catch (err) {
        console.error('Error processing buy order:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to place buy order. Please try again.';
        alert(errorMessage);
    } finally {
        setIsSubmitting(false);
    }
    };

  const closeBuyPanel = (): void => {
    setShowBuyPanel(false);
    setSelectedStock(null);
    setQuantity(0);
    setTotalPrice(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1419] text-white">
        <TopBar />
        <div className="flex justify-center items-center h-96">
          <div className="text-xl">Loading stocks...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F1419] text-white">
        <TopBar />
        <div className="flex justify-center items-center h-96">
          <div className="text-xl text-red-500">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1419] text-white">
      <TopBar />
      
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - Stock List (70%) */}
        <div className="w-[70%] p-6 overflow-y-auto">
          <h1 className="text-3xl font-bold mb-6">Available Stocks</h1>
          
          <div className="grid gap-4">
            {stocks.map((stock) => {
            const price = getPrice(stock.tick);
            const { change, changePercent } = getChange(stock.tick);
            
            return (
                <div
                key={stock.symbol}
                onClick={() => handleStockSelect(stock)}
                className="bg-[#181B20] border border-[#23262b] rounded-lg p-4 cursor-pointer hover:bg-[#1f2329] transition-colors"
                >
                <div className="flex justify-between items-center">
                    <div>
                    <h3 className="text-xl font-semibold">{stock.symbol}</h3>
                    <p className="text-gray-400">{stock.name || stock.symbol}</p>
                    </div>
                    <div className="text-right">
                    <p className="text-2xl font-bold">PKR {price.toFixed(2)}</p>
                    <p className={`text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePercent.toFixed(2)}%)
                    </p>
                    </div>
                </div>
                </div>
            );
            })}
          </div>
        </div>

        {/* Right Side - Buy Panel (30%) */}
        <div 
        className={`w-[30%] bg-[#181B20] border-l border-[#23262b] transition-transform duration-300 ease-in-out h-full ${
            showBuyPanel ? 'transform translate-x-0' : 'transform translate-x-full'
        }`}
        >
          {selectedStock && (
            <div className="p-6 w-full max-h-full flex flex-col justify-center">
              {/* Close Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={closeBuyPanel}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Stock Details */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">{selectedStock.symbol}</h2>
                <p className="text-gray-400 mb-4">{selectedStock.name}</p>
                <div className="bg-[#0F1419] rounded-lg p-4">
                <p className="text-lg">Current Price</p>
                <p className="text-3xl font-bold">PKR {getPrice(selectedStock.tick).toFixed(2)}</p>
                <p className={`text-sm ${getChange(selectedStock.tick).change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {getChange(selectedStock.tick).change >= 0 ? '+' : ''}{getChange(selectedStock.tick).change.toFixed(2)} ({getChange(selectedStock.tick).changePercent.toFixed(2)}%)
                </p>
                </div>
              </div>

              {/* Quantity Input */}
              <div className="mb-6">
                <label className="block text-lg font-semibold mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full bg-[#0F1419] border border-[#23262b] rounded-lg p-3 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Enter quantity"
                />
              </div>

              {/* Total Price Display */}
              <div className="mb-6">
                <div className="bg-[#0F1419] rounded-lg p-4">
                  <p className="text-lg mb-2">Total Amount</p>
                  <p className="text-3xl font-bold text-green-500">
                    PKR {totalPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Buy Button */}
              <div className="mt-auto">
                <button
                    onClick={handleBuySubmit}
                    disabled={!selectedStock || quantity <= 0 || isSubmitting}
                    className={`w-full py-4 rounded-lg font-bold text-lg transition-colors ${
                        selectedStock && quantity > 0 && !isSubmitting
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    }`}
                    >
                    {isSubmitting ? 'Processing...' : `Buy ${quantity > 0 ? `${quantity} Shares` : 'Shares'}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getPrice(tick: Tick | null | undefined): number {
  if (!tick) return 0;
  return tick.price || 0;
}

function getChange(tick: Tick | null | undefined): { change: number; changePercent: number } {
  if (!tick) return { change: 0, changePercent: 0 };
  const change = tick.change || 0;
  const changePercent = (change / (tick.price - change)) * 100;
  return { change, changePercent };
}