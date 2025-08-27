import React, { useState } from 'react'
import { IoClose } from "react-icons/io5"
import SummaryApi from '../common/SummaryApi'
import Axios from '../utils/Axios'
import toast from 'react-hot-toast'
import AxiosToastError from '../utils/AxiosToastError'

const DeliveryPartnerRegistration = ({ close }) => {
  const [data, setData] = useState({
    name: "",
    phone: "",
    vehicle: ""
  })
  const [loading, setLoading] = useState(false)

  const handleOnChange = (e) => {
    const { name, value } = e.target
    setData((prev) => {
      return {
        ...prev,
        [name]: value
      }
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!data.name || !data.phone) {
      toast.error("Name and phone are required")
      return
    }

    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.registerDeliveryPartner,
        data: data
      })

      const { data: responseData } = response

      if (responseData.success) {
        toast.success(responseData.message)
        close()
        setData({
          name: "",
          phone: "",
          vehicle: ""
        })
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className='fixed top-0 bottom-0 left-0 right-0 bg-neutral-800 bg-opacity-70 z-50 flex items-center justify-center p-4'>
      <div className='bg-white max-w-md w-full p-4 rounded'>
        <div className='flex items-center justify-between gap-3'>
          <h2 className='font-semibold'>Register as Delivery Partner</h2>
          <button onClick={close} className='w-fit block ml-auto'>
            <IoClose size={25}/>
          </button>
        </div>

        <form className='my-3 grid gap-2' onSubmit={handleSubmit}>
          <div className='grid gap-1'>
            <label htmlFor='name'>Name *</label>
            <input
              type='text'
              id='name'
              placeholder='Enter your full name'
              name='name'
              value={data.name}
              onChange={handleOnChange}
              className='bg-blue-50 p-2 border border-blue-100 focus:border-primary-200 outline-none rounded'
              required
            />
          </div>

          <div className='grid gap-1'>
            <label htmlFor='phone'>Phone Number *</label>
            <input
              type='tel'
              id='phone'
              placeholder='Enter your phone number'
              name='phone'
              value={data.phone}
              onChange={handleOnChange}
              className='bg-blue-50 p-2 border border-blue-100 focus:border-primary-200 outline-none rounded'
              required
            />
          </div>

          <div className='grid gap-1'>
            <label htmlFor='vehicle'>Vehicle (Optional)</label>
            <input
              type='text'
              id='vehicle'
              placeholder='e.g., Bike, Scooter, Bicycle'
              name='vehicle'
              value={data.vehicle}
              onChange={handleOnChange}
              className='bg-blue-50 p-2 border border-blue-100 focus:border-primary-200 outline-none rounded'
            />
          </div>

          <button 
            disabled={loading}
            className={`${loading ? "bg-gray-300" : "bg-green-800 hover:bg-green-700"} text-white py-2 rounded font-semibold my-3 tracking-wide`}
          >
            {loading ? "Registering..." : "Register as Partner"}
          </button>
        </form>
      </div>
    </section>
  )
}

export default DeliveryPartnerRegistration
