import { GoogleGenAI } from "@google/genai";
import { MarketData } from "../types";

// Initialize Gemini API Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    const model = 'gemini-2.5-flash';
    
    // 1. Get Real Data from DexScreener
    const dexData = await getDexScreenerPrice();
    const dexPrice = dexData?.price || 0;
    
    // 2. Prepare Prompt for Analysis
    let prompt = "";
    const tools: any[] = [];
    
    // If we are missing the protocol rate (RPC failed), ask Gemini to find it.
    if (!chainlinkRate || chainlinkRate === 0) {
        prompt = `
          I need to compare the sAVAX price on DEXs vs the BENQI Staking Protocol rate.
          
          1. DEX Price (from DexScreener): 1 sAVAX = ${dexPrice > 0 ? dexPrice.toFixed(5) : 'UNKNOWN'} AVAX.
          
          2. I do NOT have the Protocol Exchange Rate. 
          Please use Google Search to find the current "BENQI sAVAX exchange rate" or "How much AVAX is 1 sAVAX on BENQI".
          Look for the official redemption rate. It should be greater than 1.0.
          
          Task:
          - Extract the Staking Rate (AVAX per sAVAX).
          - Compare it with the DEX Price.
          - Recommend BUY (if DEX < Stake) or STAKE (if DEX > Stake).
          
          Output strictly valid JSON:
          {
            "stakingRate": number (the rate found, e.g. 1.25),
            "analysis": "2 sentences recommendation."
          }
        `;
        tools.push({ googleSearch: {} });
    } else {
        // We have both rates
        prompt = `
          I am analyzing the sAVAX (Staked AVAX) market on Avalanche.
          
          Market Data:
          - DEX Price: 1 sAVAX = ${dexPrice.toFixed(5)} AVAX.
          - Protocol Rate: 1 sAVAX = ${chainlinkRate.toFixed(5)} AVAX.
          
          Task:
          Compare DEX price to Staking Rate.
          If DEX Price < Staking Rate => BUY.
          If DEX Price > Staking Rate => STAKE.
          
          Output strictly valid JSON:
          {
            "analysis": "2 sentences recommendation."
          }
        `;
    }

    // 3. Call Gemini
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        tools: tools.length > 0 ? tools : undefined,
        temperature: 0.2,
      },
    });

    let jsonText = response.text || "{}";
    
    // Clean up potential markdown code blocks
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }
    
    let parsed: any = {};
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error("Failed to parse Gemini JSON response:", e);
      parsed = { analysis: "Analysis currently unavailable." };
    }
    
    // Construct Source List
    const sources = [];
    if (dexData) {
      sources.push({
        title: `DexScreener (${dexData.dexId})`,
        uri: dexData.url
      });
    }
    
    // Add grounding sources if any
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({ title: chunk.web.title, uri: chunk.web.uri });
        }
      });
    }

    // Determine final rate to return
    // If we passed a chainlinkRate, use it. If not, use the one found by AI (parsed.stakingRate)
    const finalStakingRate = chainlinkRate || parsed.stakingRate || 0;

    return {
      dexPrice: dexPrice,
      stakingRate: finalStakingRate,
      analysis: parsed.analysis || "Market analysis unavailable.",
      sources
    };
  } catch (error) {
    console.error("Error fetching market insights:", error);
    // Return partial data if possible
    return {
        dexPrice: 0,
        stakingRate: chainlinkRate || 0,
        analysis: "Service temporarily unavailable.",
        sources: []
    };
  }
};