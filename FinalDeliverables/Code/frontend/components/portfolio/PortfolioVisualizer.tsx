'use client';

import { useState } from 'react';
import { TrendingUp, PieChart as PieChartIcon, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { AllocationChart } from './AllocationChart';
import { PnlBarChart } from './PnlBarChart';
import { CostValueChart } from './CostValueChart';
import { motion, AnimatePresence } from 'framer-motion';

interface PortfolioVisualizerProps {
  balance: string;
  totalAccountValue: string;
  portfolio: Array<{
    symbol: string;
    currentValue: string;
    invested: string;
    unrealizedPnl: string;
    pnlPercentage: string;
  }>;
}

const TABS = [
  { id: 'allocation', label: 'Allocation', mobileLabel: 'Alloc.', icon: <PieChartIcon className="h-4 w-4 text-emerald-500" /> },
  { id: 'pnl', label: 'P&L', icon: <TrendingUp className="h-4 w-4 text-indigo-500" /> },
  { id: 'costValue', label: 'Cost vs. Value', mobileLabel: 'Cost/Val', icon: <ArrowLeftRight className="h-4 w-4 text-amber-500" /> },
];

export function PortfolioVisualizer({
  balance,
  totalAccountValue,
  portfolio,
}: PortfolioVisualizerProps) {
  const [activeTab, setActiveTab] = useState('allocation');

  // Don't render the card at all if the portfolio is empty
  if (portfolio.length === 0) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">Portfolio Insights</CardTitle>
          <Tabs
            tabs={TABS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </CardHeader>
      <CardContent className="min-h-[320px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {activeTab === 'allocation' && (
              <AllocationChart
                balance={balance}
                totalAccountValue={totalAccountValue}
                portfolio={portfolio}
              />
            )}
            {activeTab === 'pnl' && <PnlBarChart portfolio={portfolio} />}
            {activeTab === 'costValue' && (
              <CostValueChart portfolio={portfolio} />
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
