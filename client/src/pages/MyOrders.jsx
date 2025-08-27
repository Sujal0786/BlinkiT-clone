import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import NoData from '../components/NoData';
import HelpModal from '../components/HelpModal';

const MyOrders = () => {
  const orders = useSelector(state => state.orders.order);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  const handleHelpClick = (order) => {
    setSelectedOrder(order);
    setIsHelpModalOpen(true);
  };
  return (
    <div>
      <div className='bg-white shadow-md p-3 font-semibold'>
        <h1>Order</h1>
      </div>
        {
          !orders[0] && (
            <NoData/>
          )
        }
        {
          orders.map((order,index)=>{
            return(
              <div key={order._id+index+"order"} className='order rounded p-4 text-sm'>
                  <div className='flex justify-between items-start mb-2'>
                    <p className='font-medium'>Order No: {order?.orderId}</p>
                    <button 
                      onClick={() => handleHelpClick(order)}
                      className='text-sm text-blue-600 hover:text-blue-800 hover:underline'
                    >
                      Need Help?
                    </button>
                  </div>
                  <div className='flex gap-3'>
                    <img
                      src={order.product_details.image[0]} 
                      className='w-14 h-14'
                    />  
                    <p className='font-medium'>{order.product_details.name}</p>
                  </div>
              </div>
            );
          })}
        
        {selectedOrder && (
          <HelpModal
            isOpen={isHelpModalOpen}
            onClose={() => {
              setIsHelpModalOpen(false);
              setSelectedOrder(null);
            }}
            orderId={selectedOrder?.orderId}
          />
        )}
    </div>
  )
}

export default MyOrders
