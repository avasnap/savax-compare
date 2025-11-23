export interface ComparisonResult {
  buyAmount: number;
  stakeAmount: number;
  winner: 'BUY' | 'STAKE' | 'EQUAL';
  percentageDiff: number;
  savaxDifference: number;
}

export interface Rates {
  marketPrice: number; // Cost of 1 sAVAX in AVAX on DEX
  stakingRate: number; // Cost of 1 sAVAX in AVAX via Protocol (The Index)
}

export interface MarketData {
  dexPrice: number;
  stakingRate: number;
  analysis: string;
  sources: Array<{ uri: string; title: string }>;
}

export interface AIAnalysisState {
  loading: boolean;
  data: MarketData | null;
  error: string | null;
}
