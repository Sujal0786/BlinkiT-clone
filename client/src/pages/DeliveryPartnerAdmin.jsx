import React, { useEffect, useState } from 'react'
import SummaryApi from '../common/SummaryApi'
import AxiosToastError from '../utils/AxiosToastError'
import Axios from '../utils/Axios'
import Loading from '../components/Loading'
import { IoSearchOutline } from "react-icons/io5"
import { toast } from 'react-hot-toast'

const DeliveryPartnerAdmin = () => {
  const [partnerData, setPartnerData] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  const fetchPartnerData = async () => {
    try {
      setLoading(true)
      const response = await Axios({
        ...SummaryApi.getDeliveryPartners
      })

      const { data: responseData } = response

      if (responseData.success) {
        setPartnerData(responseData.partners)
      }
    } catch (error) {
      AxiosToastError(error)
    } finally {
      setLoading(false)
    }
  }

  const togglePartnerStatus = async (partnerId, currentStatus) => {
    try {
      const response = await Axios({
        ...SummaryApi.updateDeliveryPartnerStatus,
        data: {
          partnerId,
          isAvailable: !currentStatus
        }
      })

      const { data: responseData } = response

      if (responseData.success) {
        // Update the partner's status in the local state
        setPartnerData(prevPartners => 
          prevPartners.map(partner => 
            partner._id === partnerId 
              ? { ...partner, isAvailable: !currentStatus } 
              : partner
          )
        )
        toast.success(`Status updated to ${!currentStatus ? 'Available' : 'Busy'}`)
      }
    } catch (error) {
      AxiosToastError(error)
    }
  }

  useEffect(() => {
    fetchPartnerData()
  }, [])

  const handleOnChange = (e) => {
    const { value } = e.target
    setSearch(value)
  }

  // Filter partners based on search
  const filteredPartners = partnerData.filter(partner => 
    partner.name.toLowerCase().includes(search.toLowerCase()) ||
    partner.phone.includes(search)
  )

  return (
    <section className=''>
      <div className='p-2 bg-white shadow-md flex items-center justify-between gap-4'>
        <h2 className='font-semibold'>Delivery Partners</h2>
        <div className='h-full min-w-24 max-w-56 w-full ml-auto bg-blue-50 px-4 flex items-center gap-3 py-2 rounded border focus-within:border-primary-200'>
          <IoSearchOutline size={25}/>
          <input
            type='text'
            placeholder='Search partners...' 
            className='h-full w-full outline-none bg-transparent'
            value={search}
            onChange={handleOnChange}
          />
        </div>
      </div>

      {loading && <Loading/>}

      <div className='p-4 bg-blue-50'>
        <div className='min-h-[55vh]'>
          {filteredPartners.length === 0 && !loading ? (
            <div className='text-center py-8'>
              <p className='text-gray-500'>No delivery partners found</p>
            </div>
          ) : (
            <div className='grid gap-4'>
              {filteredPartners.map((partner, index) => (
                <div key={partner._id} className='bg-white p-4 rounded-lg shadow-sm border'>
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4 items-center'>
                    <div>
                      <p className='font-semibold text-gray-800'>{partner.name}</p>
                      <p className='text-sm text-gray-600'>Partner #{index + 1}</p>
                    </div>
                    
                    <div>
                      <p className='text-sm text-gray-600'>Phone</p>
                      <p className='font-medium'>{partner.phone}</p>
                    </div>
                    
                    <div>
                      <p className='text-sm text-gray-600'>Vehicle</p>
                      <p className='font-medium'>{partner.vehicle || 'Not specified'}</p>
                    </div>
                    
                    <div className='flex items-center justify-between'>
                      <div>
                        <p className='text-sm text-gray-600'>Status</p>
                        <button 
                          onClick={() => togglePartnerStatus(partner._id, partner.isAvailable)}
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            partner.isAvailable 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {partner.isAvailable ? 'Available' : 'Busy'}
                          <span className="ml-1">
                            {partner.isAvailable ? '✓' : '✗'}
                          </span>
                        </button>
                      </div>
                      
                      <div className='text-right'>
                        <p className='text-xs text-gray-500'>
                          Joined: {new Date(partner.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className='mt-6 grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='bg-white p-4 rounded-lg shadow-sm text-center'>
            <p className='text-2xl font-bold text-blue-600'>{partnerData.length}</p>
            <p className='text-sm text-gray-600'>Total Partners</p>
          </div>
          
          <div className='bg-white p-4 rounded-lg shadow-sm text-center'>
            <p className='text-2xl font-bold text-green-600'>
              {partnerData.filter(p => p.isAvailable).length}
            </p>
            <p className='text-sm text-gray-600'>Available</p>
          </div>
          
          <div className='bg-white p-4 rounded-lg shadow-sm text-center'>
            <p className='text-2xl font-bold text-red-600'>
              {partnerData.filter(p => !p.isAvailable).length}
            </p>
            <p className='text-sm text-gray-600'>Busy</p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default DeliveryPartnerAdmin
