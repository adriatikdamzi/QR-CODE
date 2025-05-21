import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Main App component for the QR Code Generator
function App() {
  // State to hold the selected input type (e.g., 'url', 'text', 'phone')
  const [inputType, setInputType] = useState('url');
  // State to hold the actual value the user inputs
  const [inputValue, setInputValue] = useState('');
  // State to hold the generated QR code data string
  const [qrCodeValue, setQrCodeValue] = useState('');
  // State to hold the URL for an optional logo to embed in the QR code
  const [logoUrl, setLogoUrl] = useState('');
  // State for vCard specific inputs
  const [vCard, setVCard] = useState({
    firstName: '',
    lastName: '',
    organization: '',
    phone: '',
    email: '',
  });
  // State for Email specific inputs
  const [email, setEmail] = useState({
    address: '',
    subject: '',
    body: '',
  });
  // State for SMS specific inputs
  const [sms, setSms] = useState({
    number: '',
    message: '',
  });
  // State for Wi-Fi specific inputs
  const [wifi, setWifi] = useState({
    ssid: '',
    password: '',
    encryption: 'WPA', // Default encryption type
  });
  // State to manage Firebase authentication and database instances
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  // State: To track if the qrious library has been loaded
  const [isQRiousLibLoaded, setIsQRiousLibLoaded] = useState(false);


  // Ref to the QR code canvas element for drawing and downloading
  const qrCodeCanvasRef = useRef(null);

  // Firebase Initialization and Authentication
  useEffect(() => {
    try {
      // Get Firebase config from global variable, or use a default if not defined
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
      // Get App ID from global variable, or use a default if not defined
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

      // Initialize Firebase app if not already initialized
      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // Listen for authentication state changes
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          // User is signed in
          setUserId(user.uid);
        } else {
          // User is signed out or not authenticated, sign in anonymously
          try {
            // Get initial auth token from global variable
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (error) {
            console.error("Firebase authentication error:", error);
          }
        }
        setIsAuthReady(true); // Mark authentication as ready
      });

      // Cleanup subscription on component unmount
      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
    }
  }, []);

  // NEW useEffect: Dynamically load qrious.js and set isQRiousLibLoaded flag
  useEffect(() => {
    // Check if QRious is already globally available
    if (window.QRious) {
      setIsQRiousLibLoaded(true);
      return; // No need to load again
    }

    const script = document.createElement('script');
    script.src = "https://unpkg.com/qrious@4.0.2/dist/qrious.min.js"; // Using unpkg CDN for qrious
    script.onload = () => {
      // Set the flag once the script is loaded
      setIsQRiousLibLoaded(true);
      console.log("qrious.js loaded successfully!");
    };
    script.onerror = () => {
      console.error("Failed to load qrious.js script from CDN.");
    };
    document.body.appendChild(script);

    // Cleanup function to remove the script if the component unmounts
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // Effect to draw QR code on canvas whenever qrCodeValue, logoUrl, or lib status changes
  useEffect(() => {
    // Only attempt to draw if QR code value exists, canvas ref is ready, and qrious.js is loaded
    if (qrCodeValue && qrCodeCanvasRef.current && isQRiousLibLoaded && window.QRious) {
      const canvas = qrCodeCanvasRef.current;
      const ctx = canvas.getContext('2d');
      const size = 256; // Base size for the QR code
      canvas.width = size;
      canvas.height = size;

      // Clear canvas before drawing new QR code
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      console.log("Attempting to draw QR code for value:", qrCodeValue);

      // Draw QR code using qrious.js
      const qrious = new window.QRious({
        element: canvas,
        value: qrCodeValue,
        size: size,
        level: 'H', // High error correction
        background: '#FFFFFF', // Light color
        foreground: '#000000' // Dark color
      });

      // After qrious draws, draw the logo on top if provided
      if (logoUrl) {
        const img = new Image();
        img.src = logoUrl;
        img.onload = () => {
          // Calculate logo position and size to be centered and fit without obscuring too much
          const logoSize = 50; // Fixed size for the logo
          const x = (size - logoSize) / 2;
          const y = (size - logoSize) / 2;

          // Draw a white rectangle behind the logo to "excavate" the QR code area
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(x, y, logoSize, logoSize);
          ctx.drawImage(img, x, y, logoSize, logoSize);
          console.log("Logo drawn successfully.");
        };
        img.onerror = () => {
          console.error("Failed to load logo image. QR code may be drawn without logo. Check URL:", logoUrl);
        };
      }
    } else {
      // These logs can help debug if the QR code isn't appearing
      if (!isQRiousLibLoaded) console.log("Waiting for QRious library to load...");
      if (!qrCodeValue) console.log("QR code value is empty. Please generate first.");
      if (!qrCodeCanvasRef.current) console.log("Canvas element not yet rendered.");
    }
  }, [qrCodeValue, logoUrl, isQRiousLibLoaded]); // Dependencies include the library loaded status


  // Function to generate the QR code value based on input type
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

  // Function to handle downloading the QR code as a PNG image
  const downloadQrCode = () => {
    // Ensure the canvas element exists
    const canvas = qrCodeCanvasRef.current;
    if (canvas) {
      // Convert canvas content to a data URL (PNG format)
      const pngUrl = canvas.toDataURL("image/png");
      // Create a temporary link element
      const downloadLink = document.createElement("a");
      // Set the href to the PNG data URL
      downloadLink.href = pngUrl;
      // Set the download attribute with a desired filename
      downloadLink.download = "qrcode.png";
      // Programmatically click the link to trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // Function to reset all inputs and generated QR code
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

  // Render different input fields based on the selected input type
  const renderInputField = () => {
    switch (inputType) {
      case 'url':
        return (
          <input
            type="url"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter URL (e.g., https://example.com)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        );
      case 'text':
        return (
          <textarea
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-28"
            placeholder="Enter plain text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          ></textarea>
        );
      case 'phone':
        return (
          <input
            type="tel"
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter phone number (e.g., +1234567890)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />
        );
      case 'email':
        return (
          <div className="space-y-3">
            <input
              type="email"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Recipient Email Address"
              value={email.address}
              onChange={(e) => setEmail({ ...email, address: e.target.value })}
            />
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Subject"
              value={email.subject}
              onChange={(e) => setEmail({ ...email, subject: e.target.value })}
            />
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              placeholder="Email Body"
              value={email.body}
              onChange={(e) => setEmail({ ...email, body: e.target.value })}
            ></textarea>
          </div>
        );
      case 'sms':
        return (
          <div className="space-y-3">
            <input
              type="tel"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Recipient Phone Number"
              value={sms.number}
              onChange={(e) => setSms({ ...sms, number: e.target.value })}
            />
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              placeholder="SMS Message"
              value={sms.message}
              onChange={(e) => setSms({ ...sms, message: e.target.value })}
            ></textarea>
          </div>
        );
      case 'vcard':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="text"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="First Name"
              value={vCard.firstName}
              onChange={(e) => setVCard({ ...vCard, firstName: e.target.value })}
            />
            <input
              type="text"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Last Name"
              value={vCard.lastName}
              onChange={(e) => setVCard({ ...vCard, lastName: e.target.value })}
            />
            <input
              type="text"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-full"
              placeholder="Organization (Optional)"
              value={vCard.organization}
              onChange={(e) => setVCard({ ...vCard, organization: e.target.value })}
            />
            <input
              type="tel"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Phone Number"
              value={vCard.phone}
              onChange={(e) => setVCard({ ...vCard, phone: e.target.value })}
            />
            <input
              type="email"
              className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Email Address"
              value={vCard.email}
              onChange={(e) => setVCard({ ...vCard, email: e.target.value })}
            />
          </div>
        );
      case 'wifi':
        return (
          <div className="space-y-3">
            <input
              type="text"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Wi-Fi SSID (Network Name)"
              value={wifi.ssid}
              onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
            />
            <input
              type="password"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Password"
              value={wifi.password}
              onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
            />
            <select
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={wifi.encryption}
              onChange={(e) => setWifi({ ...wifi, encryption: e.target.value })}
            >
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4 font-sans antialiased">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-4xl w-full flex flex-col md:flex-row gap-8">
        {/* Left Section: Input and Controls */}
        <div className="flex-1 space-y-6">
          <h1 className="text-4xl font-extrabold text-gray-800 text-center md:text-left leading-tight">
            Generate Your <span className="text-blue-600">Pro QR Code</span>
          </h1>
          <p className="text-gray-600 text-center md:text-left">
            Create custom QR codes for websites, social media, contact info, and more.
          </p>

          {/* Input Type Selection */}
          <div>
            <label htmlFor="inputType" className="block text-gray-700 text-sm font-semibold mb-2">
              Select Content Type:
            </label>
            <select
              id="inputType"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              value={inputType}
              onChange={(e) => {
                setInputType(e.target.value);
                // Reset specific inputs when type changes
                setInputValue('');
                setVCard({ firstName: '', lastName: '', organization: '', phone: '', email: '' });
                setEmail({ address: '', subject: '', body: '' });
                setSms({ number: '', message: '' });
                setWifi({ ssid: '', password: '', encryption: 'WPA' });
              }}
            >
              <option value="url">Website/URL</option>
              <option value="text">Plain Text</option>
              <option value="phone">Phone Number</option>
              <option value="email">Email Address</option>
              <option value="sms">SMS Message</option>
              <option value="vcard">Contact (vCard)</option>
              <option value="wifi">Wi-Fi Access</option>
            </select>
          </div>

          {/* Dynamic Input Field */}
          <div>
            <label htmlFor="contentInput" className="block text-gray-700 text-sm font-semibold mb-2">
              Enter Content:
            </label>
            {renderInputField()}
          </div>

          {/* Optional Logo URL Input */}
          <div>
            <label htmlFor="logoUrl" className="block text-gray-700 text-sm font-semibold mb-2">
              Optional: Logo URL (e.g., https://placehold.co/50x50/000/fff?text=LOGO)
            </label>
            <input
              id="logoUrl"
              type="url"
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste logo image URL here"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={generateQrCode}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Generate QR Code
            </button>
            <button
              onClick={resetApp}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
            >
              Input New One
            </button>
          </div>
        </div>

        {/* Right Section: QR Code Display and Download */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-6 rounded-2xl shadow-inner">
          {qrCodeValue ? (
            <>
              <div
                className="p-4 bg-white rounded-2xl shadow-2xl transition-all duration-500 ease-in-out transform hover:scale-105"
                // The "3D effect" is achieved via a strong box-shadow and rounded corners
                style={{ boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2), 0 0 0 10px rgba(255, 255, 255, 0.5)' }}
              >
                {/* Use a plain canvas element and draw QR code using qrious.js */}
                <canvas ref={qrCodeCanvasRef} className="rounded-xl"></canvas>
              </div>
              <button
                onClick={downloadQrCode}
                className="mt-8 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Download QR Code
              </button>
            </>
          ) : (
            <div className="text-center text-gray-500 text-lg">
              <p>Your QR code will appear here after generation.</p>
              <p className="mt-2 text-sm">Input your data and click "Generate QR Code".</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
