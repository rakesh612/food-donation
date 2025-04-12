import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const DonationSection = () => {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [progress, setProgress] = useState(0);

  // Mock progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 75) return prev + 1; // Mock 75% of $10,000 goal
        clearInterval(interval);
        return prev;
      });
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleAmountSelect = (amount) => {
    setSelectedAmount(amount);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (e) => {
    setSelectedAmount(null);
    setCustomAmount(e.target.value);
  };

  const handleDonate = () => {
    const amount = selectedAmount || customAmount;
    if (!amount || amount <= 0) {
      alert('Please select or enter a valid amount.');
      return;
    }
    alert(`Thank you for donating $${amount} to keep ZeroWaste running!`);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <motion.h2
          className="text-3xl font-bold text-center text-green-800 mb-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          Support ZeroWaste’s Mission
        </motion.h2>
        <motion.p
          className="text-lg text-center text-gray-700 mb-8 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Your donation helps power our AI and geolocation tools to save food and feed communities for years to come.
        </motion.p>
        <div className="flex flex-col items-center">
          {/* Preset Amounts */}
          <div className="flex gap-4 mb-6">
            {[10, 25, 50].map((amount) => (
              <motion.button
                key={amount}
                className={`px-6 py-3 rounded-lg font-medium transition-all ${
                  selectedAmount === amount
                    ? 'bg-green-600 text-white'
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
                onClick={() => handleAmountSelect(amount)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                animate={{ scale: selectedAmount === amount ? [1, 1.05, 1] : 1 }}
                transition={{ repeat: selectedAmount === amount ? Infinity : 0, duration: 1.5 }}
              >
                ${amount}
              </motion.button>
            ))}
          </div>
          {/* Custom Amount */}
          <motion.div
            className="mb-6 w-full max-w-xs"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <label className="block text-gray-700 mb-2">Or Enter Custom Amount</label>
            <input
              type="number"
              value={customAmount}
              onChange={handleCustomAmountChange}
              placeholder="$ Enter amount"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
              min="1"
            />
          </motion.div>
          {/* Progress Bar */}
          <motion.div
            className="w-full max-w-md mb-6"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-gray-700 mb-2">Our Goal: $10,000</p>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <motion.div
                className="bg-green-600 h-4 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}% `}}
                transition={{ duration: 3, ease: 'easeOut' }}
              />
            </div>
            <p className="text-gray-700 mt-2">${(progress * 100).toLocaleString()} raised!</p>
          </motion.div>
          {/* Donate Button */}
          <motion.button
            className="bg-green-600 text-white px-8 py-3 rounded-lg font-medium"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            onClick={handleDonate}
          >
            Donate Now
          </motion.button>
        </div>
      </div>
    </section>
  );
};

export default DonationSection;