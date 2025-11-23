import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, Wallet, ArrowRightLeft, ShieldCheck, ExternalLink, Info } from 'lucide-react';
import { InputCard } from './components/InputCard';
import { AIInsights } from './components/AIInsights';
import { fetchMarketInsights } from './services/gemini';
import { fetchProtocolStakingRate } from './services/chainlink';
import { ComparisonResult, AIAnalysisState } from './types';

function App() {
  const [amount, setAmount] = useState<string>('1000');
  const [analysis, setAnalysis] = useState<AIAnalysisState>({
    loading: true,
    data: null,
    error: null,
  });

  const loadData = async () => {
    setAnalysis(prev => ({ ...prev, loading: true, error: null }));
    try {
      // 1. Fetch official Protocol Rate (Source of Truth)
      let protocolRate = 0;
      try {
        protocolRate = await fetchProtocolStakingRate();
      } catch (e) {
        console.warn("Protocol fetch failed, falling back to AI search completely.", e);
      }

      // 2. Fetch Market Data via Gemini (passing protocol rate if available)
      const marketData = await fetchMarketInsights(protocolRate > 0 ? protocolRate : undefined);
      
      // If Protocol fetch failed, ensure we use the AI found rate
      if (protocolRate === 0 && marketData.stakingRate > 0) {
        protocolRate = marketData.stakingRate;
      } else if (protocolRate > 0) {
        // Enforce protocol rate source of truth
        marketData.stakingRate = protocolRate;
      }

      setAnalysis({
        loading: false,
        data: marketData,
        error: null,
      });
    } catch (error) {
      setAnalysis({
        loading: false,
        data: null,
        error: "Failed to load market data. Please try again.",
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const calculateComparison = (): ComparisonResult | null => {
    if (!analysis.data || analysis.loading) return null;
    
    const inputVal = parseFloat(amount);
    if (isNaN(inputVal) || inputVal <= 0) return null;

    // DEX: 1 sAVAX = price AVAX. You have inputVal AVAX.
    // sAVAX received = inputVal / price
    const dexSavax = inputVal / analysis.data.dexPrice;
    
    // Protocol: 1 sAVAX = rate AVAX.
    // sAVAX received = inputVal / rate
    const stakeSavax = inputVal / analysis.data.stakingRate;
    
    const diff = dexSavax - stakeSavax;
    
    let winner: 'BUY' | 'STAKE' | 'EQUAL' = 'EQUAL';
    if (dexSavax > stakeSavax) winner = 'BUY';
    if (stakeSavax > dexSavax) winner = 'STAKE';
    
    const percentageDiff = (Math.abs(diff) / Math.min(dexSavax, stakeSavax)) * 100;

    return {
      buyAmount: dexSavax,
      stakeAmount: stakeSavax,
      winner,
      percentageDiff,
      savaxDifference: Math.abs(diff)
    };
  };

  const comparison = calculateComparison();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="flex flex-col items-center justify-center space-y-4 mb-12">
          <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
            <TrendingUp className="w-10 h-10 text-indigo-400" />
          </div>
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
              sAVAX <span className="text-indigo-400">Arbitrage</span>
            </h1>
            <p className="text-slate-400 max-w-lg mx-auto text-lg">
              Real-time market analysis to optimize your liquid staking strategy on Avalanche.
            </p>
          </div>
        </header>

        {/* Main Interface */}
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Input & Results */}
          <div className="space-y-6">
            <InputCard 
              label="Investment Amount (AVAX)"
              value={amount}
              onChange={setAmount}
              icon={<Wallet className="w-5 h-5 text-indigo-400" />}
              hint="Amount of AVAX you want to convert to sAVAX"
              step="0.1"
            />

            {/* Comparison Cards */}
            <div className="grid gap-4">
               {/* DEX Option */}
               <div className={`relative overflow-hidden rounded-xl border p-5 transition-all ${
                 comparison?.winner === 'BUY' 
                   ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-900/20' 
                   : 'bg-slate-900/50 border-slate-800'
               }`}>
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <ArrowRightLeft className={`w-5 h-5 ${comparison?.winner === 'BUY' ? 'text-emerald-400' : 'text-slate-500'}`} />
                     <h3 className={`font-semibold ${comparison?.winner === 'BUY' ? 'text-emerald-200' : 'text-slate-400'}`}>
                       Swap on DEX
                     </h3>
                   </div>
                   {comparison?.winner === 'BUY' && (
                     <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded uppercase tracking-wider">
                       Best Value
                     </span>
                   )}
                 </div>
                 <div className="text-2xl font-bold text-white mb-1 font-mono">
                   {comparison ? comparison.buyAmount.toFixed(4) : '0.0000'} <span className="text-sm text-slate-500 font-sans">sAVAX</span>
                 </div>
                 <div className="text-xs text-slate-500 flex items-center gap-1">
                   1 sAVAX ≈ {analysis.data?.dexPrice.toFixed(4) || '...'} AVAX
                 </div>
               </div>

               {/* Protocol Option */}
               <div className={`relative overflow-hidden rounded-xl border p-5 transition-all ${
                 comparison?.winner === 'STAKE' 
                   ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-900/20' 
                   : 'bg-slate-900/50 border-slate-800'
               }`}>
                 <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                     <ShieldCheck className={`w-5 h-5 ${comparison?.winner === 'STAKE' ? 'text-emerald-400' : 'text-slate-500'}`} />
                     <h3 className={`font-semibold ${comparison?.winner === 'STAKE' ? 'text-emerald-200' : 'text-slate-400'}`}>
                       Mint via Protocol
                     </h3>
                   </div>
                   {comparison?.winner === 'STAKE' && (
                     <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded uppercase tracking-wider">
                       Best Value
                     </span>
                   )}
                 </div>
                 <div className="text-2xl font-bold text-white mb-1 font-mono">
                   {comparison ? comparison.stakeAmount.toFixed(4) : '0.0000'} <span className="text-sm text-slate-500 font-sans">sAVAX</span>
                 </div>
                 <div className="text-xs text-slate-500 flex items-center gap-1">
                   1 sAVAX = {analysis.data?.stakingRate.toFixed(4) || '...'} AVAX (Official Rate)
                 </div>
               </div>
            </div>

            {/* Verdict */}
            {comparison && (
               <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 flex items-center gap-4">
                  <div className={`p-3 rounded-full ${comparison.winner !== 'EQUAL' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                    <Info className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">
                      Recommendation: <span className="text-white font-bold">{comparison.winner === 'BUY' ? 'Buy on DEX' : (comparison.winner === 'STAKE' ? 'Mint on Protocol' : 'Neutral')}</span>
                    </h4>
                    <p className="text-sm text-slate-400 mt-1">
                      You receive <span className="text-emerald-400 font-mono font-bold">{comparison.savaxDifference.toFixed(4)} sAVAX</span> ({comparison.percentageDiff.toFixed(2)}%) more.
                    </p>
                  </div>
               </div>
            )}
          </div>

          {/* Right Column: AI Insights */}
          <div className="flex flex-col gap-4">
            <AIInsights analysis={analysis} onRefresh={loadData} />
            
            <button
              onClick={loadData}
              disabled={analysis.loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
            >
              <RefreshCw className={`w-5 h-5 ${analysis.loading ? 'animate-spin' : ''}`} />
              {analysis.loading ? 'Analyzing Market...' : 'Refresh Market Data'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;