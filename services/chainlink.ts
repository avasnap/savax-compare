// services/chainlink.ts

// Official public RPC endpoint for Avalanche C-Chain
const RPC_URLS = [
  "https://api.avax.network/ext/bc/C/rpc"
];

// BENQI sAVAX Contract Address
const SAVAX_CONTRACT = "0x2b2C81e08f1Af8835a78Bb2A90AE924ACE0eA4bE";

const fetchRateFromRpc = async (url: string): Promise<number> => {
  // getPooledAvaxByShares(uint256 sharesAmount)
  // Selector: 0x77c7b8fc
  // Argument: 1 sAVAX (1e18) = 0de0b6b3a7640000 (hex) padded to 32 bytes
  const methodId = "0x77c7b8fc";
  const amountParam = "0000000000000000000000000000000000000000000000000de0b6b3a7640000";
  
  const payload = {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [
      {
        to: SAVAX_CONTRACT,
        data: methodId + amountParam
      },
      "latest"
    ],
    id: 1
  };

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(id);

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const json = await response.json();
    
    if (json.error) {
      const errorMsg = typeof json.error === 'object' && json.error.message 
        ? json.error.message 
        : JSON.stringify(json.error);
      throw new Error(`RPC Error: ${errorMsg}`);
    }

    const resultHex = json.result;
    
    if (!resultHex || resultHex === "0x") {
      throw new Error("Empty result from RPC");
    }

    // Convert hex to BigInt, then to number
    // 1 sAVAX input returns Amount of AVAX in Wei
    const weiAmount = BigInt(resultHex);
    const rate = Number(weiAmount) / 1e18;
    
    if (isNaN(rate) || rate <= 0) {
        throw new Error("Invalid rate calculated");
    }

    return rate;
  } catch (error: any) {
    throw error;
  }
};

export const fetchProtocolStakingRate = async (): Promise<number> => {
  let lastError = null;

  for (const url of RPC_URLS) {
    try {
      const rate = await fetchRateFromRpc(url);
      console.log(`Fetched protocol rate from ${url}: ${rate}`);
      return rate;
    } catch (error) {
      console.warn(`RPC failed (${url}):`, error);
      lastError = error;
    }
  }

  throw lastError || new Error("RPC endpoint failed");
};