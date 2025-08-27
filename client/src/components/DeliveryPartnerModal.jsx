import React from 'react'
import { IoClose, IoCheckmarkCircle } from "react-icons/io5"
import { FaMotorcycle, FaPhone, FaClock } from "react-icons/fa"

const DeliveryPartnerModal = ({ deliveryPartner, orderId, close }) => {
  return (
    <section className='fixed top-0 bottom-0 left-0 right-0 bg-neutral-800 bg-opacity-70 z-50 flex items-center justify-center p-4'>
      <div className='bg-white max-w-md w-full p-6 rounded-lg shadow-xl'>
        <div className='flex items-center justify-between gap-3 mb-4'>
          <div className='flex items-center gap-2'>
            <IoCheckmarkCircle className='text-green-500' size={24}/>
            <h2 className='font-semibold text-lg'>Order Confirmed!</h2>
          </div>
          <button onClick={close} className='text-gray-400 hover:text-gray-600'>
            <IoClose size={25}/>
          </button>
        </div>

        <div className='text-center mb-6'>
          <p className='text-gray-600 mb-2'>Your order has been placed successfully</p>
          <p className='text-sm text-gray-500'>Order ID: #{orderId}</p>
        </div>

        {deliveryPartner && (
          <div className='bg-blue-50 rounded-lg p-4 mb-4'>
            <h3 className='font-semibold text-blue-800 mb-3 flex items-center gap-2'>
              <FaMotorcycle className='text-blue-600'/>
              Delivery Partner Assigned
            </h3>
            
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-gray-600'>Partner Name:</span>
                <span className='font-medium'>{deliveryPartner.name}</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <span className='text-gray-600 flex items-center gap-1'>
                  <FaPhone size={12}/>
                  Phone:
                </span>
                <span className='font-medium'>{deliveryPartner.phone}</span>
              </div>
              
              <div className='flex items-center justify-between'>
                <span className='text-gray-600 flex items-center gap-1'>
                  <FaClock size={12}/>
                  ETA:
                </span>
                <span className='font-medium text-green-600'>{deliveryPartner.eta}</span>
              </div>
            </div>
          </div>
        )}

        <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4'>
          <p className='text-yellow-800 text-sm'>
            <strong>Cash on Delivery:</strong> Please keep exact change ready. 
            Your delivery partner will contact you shortly.
          </p>
        </div>

        <div className='flex gap-3'>
          <button 
            onClick={close}
            className='flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors'
          >
            Close
          </button>
          
          {deliveryPartner && (
            <a 
              href={`tel:${deliveryPartner.phone}`}
              className='flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium text-center transition-colors'
            >
              Call Partner
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

export default DeliveryPartnerModal
