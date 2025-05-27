<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Code Generator</title>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- React and ReactDOM via CDN -->
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>

  <!-- Firebase (compat versions for easier usage without ES Modules) -->
  <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js"></script>

  <!-- Babel for JSX support in-browser (development only) -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
</head>
<body class="bg-gray-100">

  <!-- React Root -->
  <div id="root"></div>

  <!-- React App Script -->
  <script type="text/babel">
    const __firebase_config = JSON.stringify({
      apiKey: "YOUR_API_KEY",
      authDomain: "YOUR_AUTH_DOMAIN",
      projectId: "YOUR_PROJECT_ID",
      storageBucket: "YOUR_STORAGE_BUCKET",
      messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
      appId: "YOUR_APP_ID"
    });
    const __app_id = 'YOUR_APP_ID';
    const __initial_auth_token = null;

    function App() {
      const [inputType, setInputType] = React.useState('url');
      const [inputValue, setInputValue] = React.useState('');
      const [qrCodeValue, setQrCodeValue] = React.useState('');
      const [logoUrl, setLogoUrl] = React.useState('');
      const [vCard, setVCard] = React.useState({ firstName: '', lastName: '', organization: '', phone: '', email: '' });
      const [email, setEmail] = React.useState({ address: '', subject: '', body: '' });
      const [sms, setSms] = React.useState({ number: '', message: '' });
      const [wifi, setWifi] = React.useState({ ssid: '', password: '', encryption: 'WPA' });
      const [isQRiousLibLoaded, setIsQRiousLibLoaded] = React.useState(false);

      const qrCodeCanvasRef = React.useRef(null);

      React.useEffect(() => {
        if (window.QRious) {
          setIsQRiousLibLoaded(true);
          return;
        }

        const script = document.createElement('script');
        script.src = "https://unpkg.com/qrious@4.0.2/dist/qrious.min.js";
        script.onload = () => setIsQRiousLibLoaded(true);
        script.onerror = () => console.error("Failed to load QRious.");
        document.body.appendChild(script);

        return () => {
          if (document.body.contains(script)) document.body.removeChild(script);
        };
      }, []);

      React.useEffect(() => {
        if (qrCodeValue && qrCodeCanvasRef.current && isQRiousLibLoaded && window.QRious) {
          const canvas = qrCodeCanvasRef.current;
          const ctx = canvas.getContext('2d');
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          new window.QRious({
            element: canvas,
            value: qrCodeValue,
            size: size,
            level: 'H',
            background: '#ffffff',
            foreground: '#000000'
          });

          if (logoUrl) {
            const img = new Image();
            img.src = logoUrl;
            img.onload = () => {
              const logoSize = 50;
              const x = (size - logoSize) / 2;
              const y = (size - logoSize) / 2;
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(x, y, logoSize, logoSize);
              ctx.drawImage(img, x, y, logoSize, logoSize);
            };
          }
        }
      }, [qrCodeValue, logoUrl, isQRiousLibLoaded]);

      const generateQrCode = () => {
        let data = '';
        switch (inputType) {
          case 'url':
          case 'text':
            data = inputValue;
            break;
          case 'phone':
            data = `tel:${inputValue}`;
            break;
          case 'email':
            data = `mailto:${email.address}?subject=${encodeURIComponent(email.subject)}&body=${encodeURIComponent(email.body)}`;
            break;
          case 'sms':
            data = `smsto:${sms.number}:${encodeURIComponent(sms.message)}`;
            break;
          case 'vcard':
            data = `BEGIN:VCARD\nVERSION:3.0\nN:${vCard.lastName};${vCard.firstName}\nORG:${vCard.organization}\nTEL:${vCard.phone}\nEMAIL:${vCard.email}\nEND:VCARD`;
            break;
          case 'wifi':
            data = `WIFI:S:${wifi.ssid};T:${wifi.encryption};P:${wifi.password};;`;
            break;
          default:
            data = inputValue;
        }
        setQrCodeValue(data);
      };

      const downloadQrCode = () => {
        const canvas = qrCodeCanvasRef.current;
        if (canvas) {
          const pngUrl = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.href = pngUrl;
          link.download = "qrcode.png";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      };

      const resetApp = () => {
        setInputType('url');
        setInputValue('');
        setQrCodeValue('');
        setLogoUrl('');
        setVCard({ firstName: '', lastName: '', organization: '', phone: '', email: '' });
        setEmail({ address: '', subject: '', body: '' });
        setSms({ number: '', message: '' });
        setWifi({ ssid: '', password: '', encryption: 'WPA' });
      };

      const renderInput = () => {
        switch (inputType) {
          case 'url':
            return <input type="url" className="input" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Enter URL" />;
          case 'text':
            return <textarea className="input h-28" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Enter text" />;
          case 'phone':
            return <input type="tel" className="input" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Phone number" />;
          case 'email':
            return (
              <div className="space-y-2">
                <input className="input" value={email.address} onChange={e => setEmail({ ...email, address: e.target.value })} placeholder="Email address" />
                <input className="input" value={email.subject} onChange={e => setEmail({ ...email, subject: e.target.value })} placeholder="Subject" />
                <textarea className="input h-24" value={email.body} onChange={e => setEmail({ ...email, body: e.target.value })} placeholder="Body" />
              </div>
            );
          case 'sms':
            return (
              <div className="space-y-2">
                <input className="input" value={sms.number} onChange={e => setSms({ ...sms, number: e.target.value })} placeholder="Phone number" />
                <textarea className="input h-24" value={sms.message} onChange={e => setSms({ ...sms, message: e.target.value })} placeholder="Message" />
              </div>
            );
          case 'vcard':
            return (
              <div className="space-y-2">
                <input className="input" placeholder="First name" value={vCard.firstName} onChange={e => setVCard({ ...vCard, firstName: e.target.value })} />
                <input className="input" placeholder="Last name" value={vCard.lastName} onChange={e => setVCard({ ...vCard, lastName: e.target.value })} />
                <input className="input" placeholder="Organization" value={vCard.organization} onChange={e => setVCard({ ...vCard, organization: e.target.value })} />
                <input className="input" placeholder="Phone" value={vCard.phone} onChange={e => setVCard({ ...vCard, phone: e.target.value })} />
                <input className="input" placeholder="Email" value={vCard.email} onChange={e => setVCard({ ...vCard, email: e.target.value })} />
              </div>
            );
          case 'wifi':
            return (
              <div className="space-y-2">
                <input className="input" placeholder="SSID" value={wifi.ssid} onChange={e => setWifi({ ...wifi, ssid: e.target.value })} />
                <input type="password" className="input" placeholder="Password" value={wifi.password} onChange={e => setWifi({ ...wifi, password: e.target.value })} />
                <select className="input bg-white" value={wifi.encryption} onChange={e => setWifi({ ...wifi, encryption: e.target.value })}>
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None</option>
                </select>
              </div>
            );
          default:
            return null;
        }
      };

      return (
        <div className="max-w-4xl mx-auto p-6 bg-white mt-10 rounded-xl shadow-md">
          <h1 className="text-3xl font-bold mb-4 text-center text-blue-700">QR Code Generator</h1>

          <div className="mb-4">
            <label className="block text-gray-700 font-semibold mb-1">Select type:</label>
            <select className="input bg-white" value={inputType} onChange={e => setInputType(e.target.value)}>
              <option value="url">URL</option>
              <option value="text">Text</option>
              <option value="phone">Phone</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="vcard">vCard</option>
              <option value="wifi">WiFi</option>
            </select>
          </div>

          <div className="mb-4">{renderInput()}</div>

          <input className="input mb-4" placeholder="Logo URL (optional)" value={logoUrl} onChange={e => setLogoUrl(e.target.value)} />

          <div className="flex flex-wrap gap-4 mb-6">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-md" onClick={generateQrCode}>Generate</button>
            <button className="bg-gray-300 px-6 py-2 rounded-md" onClick={resetApp}>Reset</button>
            <button className="bg-green-600 text-white px-6 py-2 rounded-md" onClick={downloadQrCode}>Download</button>
          </div>

          {qrCodeValue ? (
            <div className="flex justify-center">
              <canvas ref={qrCodeCanvasRef} className="rounded-lg shadow-lg" />
            </div>
          ) : (
            <p className="text-center text-gray-500">Your QR Code will appear here.</p>
          )}
        </div>
      );
    }

    ReactDOM.createRoot(document.getElementById("root")).render(<App />);

  </script>

  <style>
    .input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 0.5rem;
      outline: none;
      transition: border 0.2s;
    }

    .input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 1px #2563eb;
    }
  </style>
</body>
</html>
