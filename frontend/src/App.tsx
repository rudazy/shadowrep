import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import ShadowRepABI from './contracts/ShadowRep.json';
import './App.css';

const CONTRACT_ADDRESS = "0x41fa55ceFD625E50Fa1Ae08bAeA87aC5C8BE0aD7";
const SEPOLIA_CHAIN_ID = "0xaa36a7";

function App() {
  const [account, setAccount] = useState<string>("");
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalAttestations, setTotalAttestations] = useState<number>(0);
  const [attestTo, setAttestTo] = useState<string>("");
  const [attestScore, setAttestScore] = useState<string>("50");
  const [checkAddress, setCheckAddress] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showDocs, setShowDocs] = useState<boolean>(false);

  useEffect(() => {
    if (contract && account) {
      loadUserData();
    }
  }, [contract, account]);

  async function connectWallet() {
    if (!window.ethereum) {
      setStatus("Please install MetaMask");
      return;
    }

    try {
      setLoading(true);
      setStatus("Connecting...");

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: SEPOLIA_CHAIN_ID }],
        });
      }

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const shadowRep = new ethers.Contract(
        CONTRACT_ADDRESS,
        ShadowRepABI.abi,
        signer
      );

      setAccount(accounts[0]);
      setContract(shadowRep);
      setStatus("Connected to Sepolia");
    } catch (error: any) {
      setStatus("Connection failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserData() {
    if (!contract || !account) return;

    try {
      const registered = await contract.isRegistered(account);
      const users = await contract.totalUsers();
      const attestations = await contract.totalAttestations();

      setIsRegistered(registered);
      setTotalUsers(Number(users));
      setTotalAttestations(Number(attestations));
    } catch (error: any) {
      console.error("Error loading data:", error);
    }
  }

  async function register() {
    if (!contract) return;

    try {
      setLoading(true);
      setStatus("Confirm in MetaMask...");

      const tx = await contract.register();
      setStatus("Transaction pending...");
      await tx.wait();

      setIsRegistered(true);
      setStatus("Registration successful! Encrypted profile created.");
      loadUserData();
    } catch (error: any) {
      if (error.code === "ACTION_REJECTED") {
        setStatus("Transaction cancelled");
      } else {
        setStatus("Failed: " + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function giveAttestation() {
    if (!contract || !attestTo) return;

    try {
      setLoading(true);
      setStatus("Validating attestation...");

      const isRecipientRegistered = await contract.isRegistered(attestTo);
      if (!isRecipientRegistered) {
        setStatus("Error: Recipient is not registered");
        setLoading(false);
        return;
      }

      const alreadyAttested = await contract.hasAttested(account, attestTo);
      if (alreadyAttested) {
        setStatus("Error: You already attested to this user");
        setLoading(false);
        return;
      }

      const score = parseInt(attestScore);
      if (isNaN(score) || score < 1 || score > 100) {
        setStatus("Error: Score must be 1-100");
        setLoading(false);
        return;
      }

      setStatus(
        "Validated! The contract's giveAttestation() requires FHE-encrypted input (externalEuint64). " +
        "In production, score '" + score + "' would be encrypted client-side using Zama's fhevmjs before submission. " +
        "View the verified contract on Etherscan to see the FHE implementation."
      );

    } catch (error: any) {
      setStatus("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkUser() {
    if (!contract || !checkAddress) return;

    try {
      setLoading(true);
      setStatus("Checking user...");

      const [registered, lastActive] = await contract.getProfile(checkAddress);

      if (!registered) {
        setStatus("User is not registered");
      } else {
        const date = new Date(Number(lastActive) * 1000);
        setStatus("User registered. Last active: " + date.toLocaleString());
      }
    } catch (error: any) {
      setStatus("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>ShadowRep</h1>
        <p>Confidential On-Chain Reputation Protocol</p>
        <button className="docs-toggle" onClick={() => setShowDocs(!showDocs)}>
          {showDocs ? "Hide" : "How It Works"}
        </button>
      </header>

      {showDocs && (
        <section className="docs-section">
          <h2>What is ShadowRep?</h2>
          <p>
            A privacy-preserving reputation system built on Zama's Fully Homomorphic Encryption (FHE).
            Reputation scores stay encrypted at all times - even while being computed on-chain.
          </p>

          <h3>The Problem</h3>
          <p>
            Traditional on-chain reputation exposes all data publicly. Anyone can see scores and attestations,
            enabling gaming, stalking, and manipulation.
          </p>

          <h3>The Solution</h3>
          <ul>
            <li><strong>Encrypted Attestations:</strong> Scores (1-100) are encrypted before going on-chain</li>
            <li><strong>Homomorphic Computation:</strong> Scores add up while staying encrypted</li>
            <li><strong>Threshold Proofs:</strong> Prove you have ≥X reputation without revealing exact score</li>
            <li><strong>Access Control:</strong> Grant specific contracts permission to check your score</li>
          </ul>

          <h3>Zama FHE Integration</h3>
          <ul>
            <li><strong>euint64:</strong> Encrypted 64-bit integers for scores</li>
            <li><strong>FHE.add():</strong> Homomorphic addition on encrypted values</li>
            <li><strong>FHE.ge():</strong> Encrypted greater-than-or-equal comparison</li>
            <li><strong>FHE.allow():</strong> Granular access control for encrypted data</li>
          </ul>

          <h3>Use Cases</h3>
          <ul>
            <li><strong>DeFi:</strong> Undercollateralized lending based on encrypted reputation</li>
            <li><strong>DAOs:</strong> Weighted voting without revealing weights</li>
            <li><strong>Hiring:</strong> Prove credentials without exposing details</li>
            <li><strong>Gaming:</strong> Hidden rankings for fair matchmaking</li>
          </ul>
        </section>
      )}

      <main>
        {!account ? (
          <section className="connect-section">
            <button onClick={connectWallet} disabled={loading}>
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
            <p className="note">Requires MetaMask on Sepolia testnet</p>
          </section>
        ) : (
          <>
            <section className="account-section">
              <p><strong>Account:</strong> {account.slice(0, 6)}...{account.slice(-4)}</p>
              <p><strong>Status:</strong> {isRegistered ? "Registered" : "Not Registered"}</p>
            </section>

            <section className="stats-section">
              <div className="stat">
                <span className="stat-value">{totalUsers}</span>
                <span className="stat-label">Total Users</span>
              </div>
              <div className="stat">
                <span className="stat-value">{totalAttestations}</span>
                <span className="stat-label">Attestations</span>
              </div>
            </section>

            {!isRegistered ? (
              <section className="register-section">
                <h2>Get Started</h2>
                <p>Register to create your encrypted reputation profile.</p>
                <button onClick={register} disabled={loading}>
                  {loading ? "Processing..." : "Register"}
                </button>
              </section>
            ) : (
              <>
                <section className="attest-section">
                  <h2>Give Attestation</h2>
                  <p>Submit an encrypted reputation score (1-100) to another user.</p>
                  <input
                    type="text"
                    placeholder="Recipient address (0x...)"
                    value={attestTo}
                    onChange={(e) => setAttestTo(e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={attestScore}
                    onChange={(e) => setAttestScore(e.target.value)}
                  />
                  <button onClick={giveAttestation} disabled={loading || !attestTo}>
                    {loading ? "Processing..." : "Submit Attestation"}
                  </button>
                </section>

                <section className="check-section">
                  <h2>Check User</h2>
                  <p>Check if a user is registered and their last activity.</p>
                  <input
                    type="text"
                    placeholder="User address (0x...)"
                    value={checkAddress}
                    onChange={(e) => setCheckAddress(e.target.value)}
                  />
                  <button onClick={checkUser} disabled={loading || !checkAddress}>
                    {loading ? "Checking..." : "Check"}
                  </button>
                </section>
              </>
            )}
          </>
        )}

        {status && (
          <section className="status-section">
            <p>{status}</p>
          </section>
        )}
      </main>

      <footer>
        <p>
          <a href="https://sepolia.etherscan.io/address/0x41fa55ceFD625E50Fa1Ae08bAeA87aC5C8BE0aD7#code" target="_blank" rel="noopener noreferrer">
            View Contract
          </a>
          {" | "}
          <a href="https://github.com/rudazy/shadowrep" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;