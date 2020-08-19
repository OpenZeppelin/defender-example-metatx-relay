import React, { useEffect, useState } from 'react';
import { fetch as fetchValue } from '../eth/boxes.js';
import './BoxValue.css';

function BoxValue() {
  const [value, setValue] = useState('');

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        setValue(await fetchValue());
      } catch (err) {
        console.error(err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  return value ? (<div className="BoxValue">
    <p>Value stored for the current address is {value} <a href={`https://rinkeby.etherscan.io/address/${process.env.REACT_APP_BOXES_ADDRESS}#readContract`} target="_blank">(view in Etherscan)</a></p>
  </div>) : '';
}

export default BoxValue;