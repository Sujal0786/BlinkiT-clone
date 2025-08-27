import React, { useState } from 'react';

const HelpModal = ({ isOpen, onClose, orderId }) => {
  const [selectedOption, setSelectedOption] = useState(null);

  const helpOptions = [
    {
      id: 'not-received',
      question: 'I didn\'t receive my order',
      response: 'We\'re sorry to hear that. Please allow 24-48 hours for delivery. If you still haven\'t received your order, please contact our support team.'
    },
    {
      id: 'late',
      question: 'Order is late',
      response: 'We\'re sorry for the delay! Please wait 10 more mins. If still not delivered, contact support.'
    },
    {
      id: 'wrong-item',
      question: 'Wrong item delivered',
      response: 'We apologize for the inconvenience. Please contact our support team with your order number and details of the incorrect item received.'
    },
    {
      id: 'payment-issue',
      question: 'Payment issue',
      response: 'For any payment-related issues, please check your bank statement first. If the issue persists, contact our support team with your transaction details.'
    },
    {
  id: 'other',
  question: 'Other queries',
  response: "Please describe your issue to our support team, and we'll get back to you as soon as possible., mail us at blinkeyit.65.Support@gmail.com"
}

  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Order Help - #{orderId}</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          {!selectedOption ? (
            <>
              <p className="mb-4">Hi! How can I help you with Order #{orderId}?</p>
              <div className="space-y-2">
                {helpOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setSelectedOption(option)}
                    className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50 transition-colors"
                  >
                    {option.question}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div>
              <p className="mb-4">{selectedOption.response}</p>
              <div className="flex justify-between mt-6">
                <button
                  onClick={() => setSelectedOption(null)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
