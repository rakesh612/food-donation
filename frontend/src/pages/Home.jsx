import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import DonationSection from './DonationSection';

// Custom Icons
const IconArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M12 5l7 7-7 7"/>
  </svg>
);

const IconChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

const IconArrowUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
);

const Home = () => {
  const [activeSection, setActiveSection] = useState(null);
  // const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Toggle FAQ sections
  const toggleSection = (index) => {
    setActiveSection(activeSection === index ? null : index);
  };

  // Scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const faqItems = [
    {
      question: "How does food donation work?",
      answer: "Our AI matches donors with local recipients. List food, set a pickup time, and track the donation in real-time."
    },
    {
      question: "What types of food can I donate?",
      answer: "From fresh produce to non-perishables, we accept safe, edible food. Our AI even estimates quantities from photos!"
    },
    {
      question: "How do I know my donation makes an impact?",
      answer: "Get real-time updates on your donation’s journey, including who it helped and CO₂ savings."
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-green-50 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <motion.div
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-green-800 mb-4">
                Nourish Communities, Reduce Waste
              </h1>
              <p className="text-lg text-gray-700 mb-8">
                Use AI and geolocation to share surplus food with those in need. Every bite counts.
              </p>
              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/donor')}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all"
                >
                  Donate Food <IconArrowRight />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => navigate('/receiver')}
                  className="bg-white border-2 border-green-600 text-green-600 hover:bg-green-50 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-all"
                >
                  Reveive Food
                </motion.button>
              </div>
            </motion.div>
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 1, delay: 0.3 }}
            >
              <div className="relative group">
                <img
                  src="https://www.foodbanksmississauga.ca/wp-content/uploads/2023/09/mosaic-need_food-scaled.webp"
                  alt="Food donation"
                  className="w-full h-auto rounded-lg"
                />
                <motion.div
                  className="absolute -bottom-4 -right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg"
                  whileHover={{ rotate: 0 }}
                  initial={{ rotate: 3 }}
                >
                  <p className="font-bold text-xl">Join 10,000+ donors</p>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
        <motion.div
          className="absolute bottom-0 left-0 w-full"
          initial={{ y: 50 }}
          animate={{ y: 0 }}
          transition={{ duration: 1.5 }}
        >
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-16 text-white fill-current">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V56.44Z"></path>
          </svg>
        </motion.div>
      </section>

      {/* Modal for Map Teaser
      <AnimatePresence>
        {showModal && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white p-6 rounded-lg max-w-lg w-full relative"
              initial={{ scale: 0.8, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 50 }}
            >
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
              <h3 className="text-xl font-bold text-green-800 mb-4">See Donations Near You</h3>
              <div className="bg-gray-200 h-48 rounded-lg flex items-center justify-center mb-4">
                <p className="text-gray-600">Map Preview (Google Maps Integration Coming Soon!)</p>
              </div>
              <p className="text-gray-700 mb-4">
                Our AI-powered map shows real-time food donations in your area. Sign up to explore!
              </p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => navigate('/receiver')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg"
              >
                Join Now
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence> */}

      {/* Donation Section */}
      <DonationSection />

      {/* How It Works */}
      <section className="py-16 bg-green-50">
        <div className="max-w-6xl mx-auto px-4">
          <motion.h2
            className="text-3xl font-bold text-center text-green-800 mb-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            How It Works
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: 1,
                title: 'Register & List',
                desc: 'Sign up and list food with AI-powered quantity estimation and geolocation.',
              },
              {
                step: 2,
                title: 'Connect & Arrange',
                desc: 'Our system matches you with nearby recipients for seamless pickups.',
              },
              {
                step: 3,
                title: 'Donate & Track',
                desc: 'Complete your donation and track its impact in real-time.',
              },
            ].map((step, index) => (
              <motion.div
                key={step.step}
                className="bg-white p-6 rounded-lg shadow-md transform transition-all hover:shadow-xl"
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                whileHover={{ scale: 1.03 }}
              >
                <div className="flex items-center mb-4">
                  <div className="bg-green-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3">
                    {step.step}
                  </div>
                  <h3 className="text-xl font-semibold text-green-800">{step.title}</h3>
                </div>
                <p className="text-gray-700">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <motion.h2
            className="text-3xl font-bold text-center text-green-800 mb-12"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Frequently Asked Questions
          </motion.h2>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <motion.div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <button
                  className="w-full flex justify-between items-center p-4 bg-white hover:bg-green-50 text-left font-medium focus:outline-none"
                  onClick={() => toggleSection(index)}
                >
                  <span>{item.question}</span>
                  <motion.div
                    className="text-green-600"
                    animate={{ rotate: activeSection === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <IconChevronDown />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {activeSection === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-4 pb-4"
                    >
                      <p className="text-gray-700">{item.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action with Contact Details */}
      <section className="py-16 bg-green-600 text-white relative overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1600585154340-be6161a56a0c')] bg-cover bg-center opacity-20"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 10, repeat: Infinity, repeatType: 'reverse' }}
        />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <motion.h2
            className="text-3xl font-bold mb-4"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Ready to Make a Difference?
          </motion.h2>
          <motion.p
            className="text-lg mb-8 opacity-90"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            Join our community to fight food waste and hunger with AI and geolocation.
          </motion.p>
          <motion.div
            className="text-lg opacity-90"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            <p>Contact: +91-6304944744</p>
            <p>Email: <a href="mailto:rakeshcoc1to11@gmail.com" className="hover:text-gray-200 transition-colors">rakeshcoc1to11@gmail.com</a></p>
            <p>Instagram: <a href="https://www.instagram.com/hanumath_rakesh" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200 transition-colors">hanumath_rakesh <br></br>
            Thank you. Using. </a></p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center gap-4">
            <motion.button
              onClick={scrollToTop}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
            >
              Back to Top <IconArrowUp />
            </motion.button>
            <p className="text-gray-400">© 2025 ZeroWaste. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;