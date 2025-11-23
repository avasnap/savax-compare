import { MarketData } from "../types";

const SAVAX_ADDRESS = "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE";
const WAVAX_ADDRESS = "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7";

interface DexScreenerData {
  price: number;
  url: string;
  pairName: string;
  dexId: string;
}

// Fetch price from DexScreener API
const getDexScreenerPrice = async (): Promise<DexScreenerData | null> => {
  try {
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${SAVAX_ADDRESS}`);
    if (!response.ok) throw new Error("DexScreener API failed");
    
    const data = await response.json();
    if (!data.pairs || data.pairs.length === 0) return null;

    // Filter for pairs on Avalanche
    // We look for pairs where sAVAX is involved.
    // We primarily want sAVAX/AVAX pairs.
    const pairs = data.pairs.filter((p: any) => p.chainId === 'avalanche');
    
    if (pairs.length === 0) return null;

    // Sort by liquidity to get the most relevant price
    pairs.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
    
    const bestPair = pairs[0];

    // Determine price of 1 sAVAX in AVAX
    // DexScreener gives priceNative. 
    // If baseToken is sAVAX, priceNative is quoteToken per sAVAX.
    // If quoteToken is AVAX/WAVAX, then priceNative is what we want.
    let price = parseFloat(bestPair.priceNative);

    // Sanity check: sAVAX should be > 1 AVAX. If it's < 1, maybe inverted or wrong pair.
    // However, if the market crashes, it could be less. 
    // But usually sAVAX grows in value vs AVAX.
    
    // If base token is NOT sAVAX (e.g. it's a WAVAX/sAVAX pair), we might need to invert?
    // DexScreener 'tokens' endpoint usually returns pairs where the token is either base or quote.
    // If sAVAX is quoteToken, priceNative is Base per Quote (Base/sAVAX).
    // Let's trust DexScreener's priceNative for the token view usually works, but strictly:
    if (bestPair.baseToken.address.toLowerCase() !== SAVAX_ADDRESS.toLowerCase()) {
       // If sAVAX is the quote token, and base is AVAX.
       // priceNative is Amount of sAVAX per 1 AVAX.
       // We want Amount of AVAX per 1 sAVAX.
       // So we invert.
       if (price > 0) price = 1 / price;
    }

    return {
      price: price,
      url: bestPair.url,
      pairName: bestPair.pairAddress,
      dexId: bestPair.dexId
    };
  } catch (error) {
    console.error("DexScreener fetch error:", error);
    return null;
  }
};

export const fetchMarketInsights = async (chainlinkRate?: number): Promise<MarketData> => {
  try {
    // Get DEX price from DexScreener
    const dexData = await getDexScreenerPrice();
    const dexPrice = dexData?.price || 0;

    // Build sources list
    const sources = [];
    if (dexData) {
      sources.push({
        title: `DexScreener (${dexData.dexId})`,
        uri: dexData.url
      });
    }

    // Generate simple analysis based on comparison
    let analysis = "Compare DEX price vs Protocol rate to find the best value.";
    if (dexPrice > 0 && chainlinkRate && chainlinkRate > 0) {
      if (dexPrice < chainlinkRate) {
        const savings = ((chainlinkRate - dexPrice) / chainlinkRate * 100).toFixed(2);
        analysis = `Buying sAVAX on the DEX is currently ${savings}% cheaper than minting via the protocol. This represents an arbitrage opportunity.`;
      } else if (dexPrice > chainlinkRate) {
        const premium = ((dexPrice - chainlinkRate) / chainlinkRate * 100).toFixed(2);
        analysis = `Minting sAVAX via the protocol is currently ${premium}% cheaper than buying on the DEX. Direct staking provides better value.`;
      } else {
        analysis = "DEX price and protocol rate are approximately equal. Either method provides similar value.";
      }
    }

    return {
      dexPrice: dexPrice,
      stakingRate: chainlinkRate || 0,
      analysis,
      sources
    };
  } catch (error) {
    console.error("Error fetching market insights:", error);
    return {
        dexPrice: 0,
        stakingRate: chainlinkRate || 0,
        analysis: "Unable to fetch market data. Please try again.",
        sources: []
    };
  }
};