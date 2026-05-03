export function Tagline() {
  return (
    <div className="hidden md:flex m-10 flex-col justify-center items-center text-center p-12 bg-black/45check backdrop-blur-lg border-l border-white/10 rounded-r-3xl">
      <div className="w-16 h-16 mb-6 bg-gradient-to-br from-red-500 to-green-500 rounded-2xl shadow-lg" />
      <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-xl">
        TradeUp
      </h1>
      <p className="text-lg text-gray-200 mt-2 max-w-xs drop-shadow-lg">
        Your gateway to smarter trading.
      </p>
    </div>
  );
}