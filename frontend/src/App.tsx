import { useState, useEffect } from 'react';
import { ethers, BrowserProvider } from 'ethers';
import ShadowRepABI from './contracts/ShadowRep.json';
import './App.css';

// Contract address - update after deploying to Sepolia
const CONTRACT_ADDRESS = "0x41fa55ceFD625E50Fa1Ae08bAeA87aC5C8BE0aD7";

// Sepolia chain ID
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
  const [threshold, setThreshold] = useState<string>("100");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      // Check network
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
      setStatus("Connected");
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
      setStatus("Registering...");

      const tx = await contract.register();
      await tx.wait();

      setIsRegistered(true);
      setStatus("Registration successful");
      loadUserData();
    } catch (error: any) {
      setStatus("Registration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function giveAttestation() {
    if (!contract || !attestTo) return;

    try {
      setLoading(true);
      setStatus("Submitting attestation...");

      // Note: In production, this would use FHE encryption
      // For demo, we show the flow
      setStatus("FHE encryption would happen here. This is a demo UI.");
      
    } catch (error: any) {
      setStatus("Attestation failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function checkUserThreshold() {
    if (!contract || !checkAddress) return;

    try {
      setLoading(true);
      setStatus("Checking threshold...");

      const [registered] = await contract.getProfile(checkAddress);
      
      if (!registered) {
        setStatus("User is not registered");
      } else {
        setStatus("User is registered. Threshold check requires FHE decryption.");
      }
    } catch (error: any) {
      setStatus("Check failed: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>ShadowRep</h1>
        <p>Confidential On-Chain Reputation Protocol</p>
      </header>

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
                <p>Register to initialize your encrypted reputation profile.</p>
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
                    placeholder="Score (1-100)"
                    value={attestScore}
                    onChange={(e) => setAttestScore(e.target.value)}
                  />
                  <button onClick={giveAttestation} disabled={loading || !attestTo}>
                    {loading ? "Processing..." : "Submit Attestation"}
                  </button>
                </section>

                <section className="check-section">
                  <h2>Check Threshold</h2>
                  <p>Verify if a user meets a minimum reputation threshold.</p>
                  <input
                    type="text"
                    placeholder="User address (0x...)"
                    value={checkAddress}
                    onChange={(e) => setCheckAddress(e.target.value)}
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Minimum threshold"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                  />
                  <button onClick={checkUserThreshold} disabled={loading || !checkAddress}>
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
        <p>Built on Zama fhEVM | Zama Developer Program</p>
      </footer>
    </div>
  );
}

export default App;