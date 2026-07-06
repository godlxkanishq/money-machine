// Real NFT/contract minting. Builds calldata for a mint call, signs it with a
// wallet's real key, broadcasts it to the live network, and waits for the receipt.
import * as ethers from "ethers";
import { decKey, providerFor, getNetwork } from "./wallet.js";

// Build calldata from either a human-readable function signature + args,
// or a raw hex data string.
export function buildCalldata({ functionSig, args, rawData }) {
  if (rawData && rawData.trim()) {
    const d = rawData.trim();
    return d.startsWith("0x") ? d : "0x" + d;
  }
  if (!functionSig || !functionSig.trim()) return "0x"; // plain value transfer / fallback mint
  const frag = functionSig.trim().startsWith("function")
    ? functionSig.trim()
    : "function " + functionSig.trim();
  const iface = new ethers.Interface([frag]);
  const name = iface.fragments[0].name;
  const parsed = Array.isArray(args) ? args : [];
  return iface.encodeFunctionData(name, parsed);
}

// Execute a mint from one wallet. Returns a per-wallet result.
async function mintFromWallet(w, { to, data, valueWei, gasLimit }) {
  const provider = providerFor();
  const signer = new ethers.Wallet(decKey(w.key), provider);
  const txReq = { to, data, value: valueWei };
  if (gasLimit) txReq.gasLimit = BigInt(gasLimit);
  else {
    try {
      const est = await provider.estimateGas({ ...txReq, from: w.address });
      txReq.gasLimit = (est * 12n) / 10n; // +20% headroom
    } catch (e) {
      // Surface the revert reason before we spend anything.
      throw new Error(e.shortMessage || e.reason || e.message || "gas estimation failed");
    }
  }
  const tx = await signer.sendTransaction(txReq);
  const receipt = await tx.wait(1);
  return {
    walletId: w.id,
    address: w.address,
    hash: tx.hash,
    status: receipt && receipt.status === 1 ? "success" : "failed",
    blockNumber: receipt ? receipt.blockNumber : null,
    gasUsed: receipt ? receipt.gasUsed.toString() : null,
  };
}

// Run a mint task across the chosen wallets. Wallets run in parallel — each has
// its own nonce, so there is no nonce collision.
export async function runMint(task, wallets) {
  const net = getNetwork();
  const to = ethers.getAddress(task.contract); // checksums + validates
  const data = buildCalldata(task);
  const valueWei = ethers.parseEther(String(task.valueEth || 0));

  const settled = await Promise.allSettled(
    wallets.map((w) => mintFromWallet(w, { to, data, valueWei, gasLimit: task.gasLimit })),
  );

  const results = settled.map((s, i) =>
    s.status === "fulfilled"
      ? { ...s.value, explorer: `${net.explorer}/tx/${s.value.hash}` }
      : {
          walletId: wallets[i].id,
          address: wallets[i].address,
          hash: null,
          status: "failed",
          error: (s.reason && (s.reason.shortMessage || s.reason.message)) || "failed",
        },
  );

  const okCount = results.filter((r) => r.status === "success").length;
  return {
    network: net.name,
    total: results.length,
    success: okCount,
    failed: results.length - okCount,
    results,
  };
}
