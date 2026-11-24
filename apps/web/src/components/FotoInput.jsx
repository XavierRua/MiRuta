import { useState } from 'react';
import { FiCamera } from 'react-icons/fi';
export default function FotoInput({ texto, redonda = false }) {
  const [url, setUrl] = useState(null);
  return (
    <label className={`foto-input ${redonda ? 'redonda' : ''}`}>
      {url ? (
        <img src={url} alt={texto} />
      ) : (
        <span>
          <FiCamera /> {texto}
        </span>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setUrl(URL.createObjectURL(f));
        }}
      />
    </label>
  );
}
