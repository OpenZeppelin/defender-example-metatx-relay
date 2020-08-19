import React, { useRef, useState } from 'react';
import { submit } from './eth/txs.js';
import BoxValue from './components/BoxValue.js';
import './App.css';

function App() {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  const inputRef = useRef(null);
  const onClick = async () => {
    setError('');
    setTxHash(null);
    setStatus('Signing and submitting request...');

    try {
      const value = inputRef.current.value;
      const tx = await submit(value);
      setTxHash(tx.hash);
      setStatus(`Meta-transaction sent `);
    } catch (err) {
      setStatus('');
      setError(err.message);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Defender meta-transactions example</h1>
        <p>
          This example uses a GSNv2 compatible TrustedForwarder contract to push meta-txs to a sample contract to store a value. The server validates user requests and sends them to the forwarder using a Defender Relayer.
        </p>
        <div>
          <input ref={inputRef} type="number"></input>
          <button onClick={onClick} type="button">Submit new value</button>
        </div>
        <div className="App-status">
          <p>{status}
          {txHash && (
            <a className="App-link" href={`https://rinkeby.etherscan.io/tx/${txHash}`} rel="noopener noreferrer" target="_blank">(view in Etherscan)</a>
          )}</p>
        </div>
        <BoxValue />
        <div className="App-error">
          {error}
        </div>
      </header>
    </div>
  );
}

export default App;
