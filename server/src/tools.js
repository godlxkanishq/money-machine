// Real on-chain utilities: disperse, collect/sweep, ERC-20 balance, RPC test.
import * as ethers from "ethers";
import { providerFor, decKey, getNetwork } from "./wallet.js";

// Send ETH from one wallet to many recipients.
export async function disperse(fromWallet, recipients) {
  const p = providerFor();
  const net = getNetwork();
  const signer = new ethers.Wallet(decKey(fromWallet.key), p);
  let nonce = await p.getTransactionCount(fromWallet.address);
  const results = [];
  for (const r of recipients) {
    try {
      const tx = await signer.sendTransaction({
        to: ethers.getAddress(r.address),
        value: ethers.parseEther(String(r.amountEth)),
        nonce: nonce++,
      });
      results.push({ address: r.address, amountEth: r.amountEth, hash: tx.hash, explorer: `${net.explorer}/tx/${tx.hash}`, status: "sent" });
    } catch (e) {
      nonce--; // tx never left; reuse the nonce
      results.push({ address: r.address, amountEth: r.amountEth, hash: null, status: "failed", error: e.shortMessage || e.message });
    }
  }
  return { total: recipients.length, sent: results.filter((x) => x.status === "sent").length, results };
}

// Sweep the full balance (minus gas) of many wallets into one destination.
export async function collect(wallets, toAddress) {
  const p = providerFor();
  const net = getNetwork();
  const to = ethers.getAddress(toAddress);
  const fee = await p.getFeeData();
  const gasPrice = fee.gasPrice ?? ethers.parseUnits("2", "gwei");
  const gasLimit = 21000n;
  const cost = gasPrice * gasLimit;
  const results = [];
  await Promise.all(
    wallets.map(async (w) => {
      try {
        const bal = await p.getBalance(w.address);
        const value = bal - cost;
        if (value <= 0n) { results.push({ address: w.address, status: "skipped", error: "balance below gas cost" }); return; }
        const signer = new ethers.Wallet(decKey(w.key), p);
        const tx = await signer.sendTransaction({ to, value, gasLimit, gasPrice });
        results.push({ address: w.address, amountEth: ethers.formatEther(value), hash: tx.hash, explorer: `${net.explorer}/tx/${tx.hash}`, status: "sent" });
      } catch (e) {
        results.push({ address: w.address, status: "failed", error: e.shortMessage || e.message });
      }
    }),
  );
  return { total: wallets.length, sent: results.filter((x) => x.status === "sent").length, results };
}

const ERC20 = [
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function name() view returns (string)",
];
export async function tokenBalance(tokenAddr, holder) {
  const p = providerFor();
  const c = new ethers.Contract(ethers.getAddress(tokenAddr), ERC20, p);
  const [raw, dec, sym, name] = await Promise.all([
    c.balanceOf(ethers.getAddress(holder)),
    c.decimals().catch(() => 18),
    c.symbol().catch(() => "?"),
    c.name().catch(() => ""),
  ]);
  return { token: tokenAddr, holder, symbol: sym, name, decimals: Number(dec), balance: ethers.formatUnits(raw, dec), raw: raw.toString() };
}

export async function testRpc(url) {
  const p = new ethers.JsonRpcProvider(url);
  const t = Date.now();
  const [network, block] = await Promise.all([p.getNetwork(), p.getBlockNumber()]);
  return { ok: true, latencyMs: Date.now() - t, chainId: Number(network.chainId), block };
}
