import React from 'react';
import { Sparkles, ExternalLink, Loader2, AlertCircle, TrendingUp, Anchor } from 'lucide-react';
import { AIAnalysisState } from '../types';

interface AIInsightsProps {
  analysis: AIAnalysisState;
  onRefresh: () => void;
}

export const AIInsights: React.FC<AIInsightsProps> = ({ analysis, onRefresh }) => {
  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-indigo-500/20 rounded-xl p-6 relative overflow-hidden shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-indigo-300 font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          Market Intelligence
        </h3>
        
        {/* Attribution / Model Info */}
        <span className="text-[10px] uppercase tracking-widest text-slate-600 font-bold">
          Powered by DexScreener & Avalanche RPC
        </span>
      </div>

      {analysis.loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 bg-indigo-500/10 rounded w-3/4"></div>
          <div className="h-4 bg-indigo-500/10 rounded w-full"></div>
        </div>
      ) : analysis.error ? (
        <div className="text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {analysis.error}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="prose prose-invert prose-sm max-w-none text-slate-300 leading-relaxed">
             {analysis.data?.analysis}
          </div>

          {analysis.data?.sources && analysis.data.sources.length > 0 && (
            <div className="pt-4 border-t border-slate-800">
              <p className="text-xs text-slate-500 mb-2 font-medium">Verified Sources:</p>
              <div className="flex flex-wrap gap-2">
                {analysis.data.sources.map((source, idx) => (
                  <a
                    key={idx}
                    href={source.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full text-xs transition-colors border border-slate-700"
                  >
                    {source.title.length > 25 ? source.title.substring(0, 25) + '...' : source.title}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
