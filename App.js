<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QR Code Generator</title>

  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>

  <!-- React + ReactDOM (CDN) -->
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>

  <!-- Babel for JSX -->
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>

  <!-- QRious (QR code library) -->
  <script src="https://unpkg.com/qrious@4.0.2/dist/qrious.min.js"></script>

  <style>
    .input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 0.5rem;
      outline: none;
    }
    .input:focus {
      border-color: #2563eb;
      box-shadow: 0 0 0 1px #2563eb;
    }
  </style>
</head>
<body class="bg-gray-100">

  <div id="root"></div>

  <script type="text/babel">
    function App() {
      const [input, setInput] = React.useState('');
      const [qrValue, setQrValue] = React.useState('');
      const qrRef = React.useRef(null);

      React.useEffect(() => {
        if (qrValue && qrRef.current && window.QRious) {
          new QRious({
            element: qrRef.current,
            value: qrValue,
            size: 256,
            level: 'H'
          });
        }
      }, [qrValue]);

      const generate = () => setQrValue(input);

      const download = () => {
        if (qrRef.current) {
          const link = document.createElement('a');
          link.download = 'qrcode.png';
          link.href = qrRef.current.toDataURL();
          link.click();
        }
      };

      return (
        <div className="max-w-xl mx-auto mt-10 bg-white p-6 rounded-xl shadow-lg">
          <h1 className="text-2xl font-bold mb-4 text-center text-blue-700">QR Code Generator</h1>
          <input
            type="text"
            placeholder="Enter text or URL"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="input mb-4"
          />
          <div className="flex gap-4 mb-4">
            <button onClick={generate} className="bg-blue-600 text-white px-4 py-2 rounded">Generate</button>
            <button onClick={download} className="bg-green-600 text-white px-4 py-2 rounded">Download</button>
          </div>
          {qrValue && <canvas ref={qrRef} className="mx-auto rounded shadow" />}
        </div>
      );
    }

    const root = ReactDOM.createRoot(document.getElementById("root"));
    root.render(<App />);
  </script>

</body>
</html>
