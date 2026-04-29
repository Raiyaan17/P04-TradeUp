import { AuthForm } from "@/components/auth/auth-form";
import { BarChart3, Globe, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="h-20 flex items-center justify-between px-8 lg:px-16 border-b border-border shrink-0">
        <div className="text-primary text-label-caps font-bold text-lg">↗ TRADEUP</div>
      </header>

      {/* Main Split Layout */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left Side: Marketing / Presentation */}
        <div className="p-8 lg:p-16 xl:p-24 flex flex-col justify-center">
          <h1 className="mb-6">THE FINTECH OF THE FUTURE.</h1>
          <p className="text-body-lg text-muted-foreground mb-12 max-w-lg">
            Experience high-energy, pure structural discipline in your trading. 
            No visual noise. Just raw data, lightning-fast execution, and unparalleled insights.
          </p>

          <div className="flex flex-col gap-10">
            <div className="flex gap-6 items-start">
              <div className="p-4 rounded-2xl bg-secondary text-primary shrink-0">
                <BarChart3 className="w-8 h-8" />
              </div>
              <div className="pt-1">
                <h3 className="mb-2">Live Market Data</h3>
                <p className="text-muted-foreground text-body-md">Real-time WebSocket streaming straight from the exchange. Flash updates as prices tick.</p>
              </div>
            </div>
            
            <div className="flex gap-6 items-start">
              <div className="p-4 rounded-2xl bg-secondary text-primary shrink-0">
                <Globe className="w-8 h-8" />
              </div>
              <div className="pt-1">
                <h3 className="mb-2">Community Tournaments</h3>
                <p className="text-muted-foreground text-body-md">Compete with friends, climb the leaderboard, and test your strategies in live oracle games.</p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="p-4 rounded-2xl bg-secondary text-primary shrink-0">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="pt-1">
                <h3 className="mb-2">Bank-Grade Security</h3>
                <p className="text-muted-foreground text-body-md">Your portfolio and assets are secured with top-tier encryption and structural integrity.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth */}
        <div className="bg-[#0e0e0e] border-l border-border p-8 lg:p-16 flex items-center justify-center">
          <div className="w-full max-w-md">
            <AuthForm />
          </div>
        </div>
      </main>
    </div>
  );
}
