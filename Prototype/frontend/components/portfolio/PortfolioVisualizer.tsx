'use client';

import { useState } from 'react';
import { BarChart3, PieChartIcon, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs } from '@/components/ui/tabs';
import { AllocationChart } from './AllocationChart';
import { PnlBarChart } from './PnlBarChart';
import { CostValueChart } from './CostValueChart';

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
  { id: 'allocation', label: 'Allocation' },
  { id: 'pnl', label: 'Profit & Loss' },
  { id: 'costValue', label: 'Cost vs. Value' },
];

export function PortfolioVisualizer({
  balance,
  totalAccountValue,
  portfolio,
}: PortfolioVisualizerProps) {
  const [activeTab, setActiveTab] = useState('allocation');

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
      <CardContent>
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
      </CardContent>
    </Card>
  );
}
