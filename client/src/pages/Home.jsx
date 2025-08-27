import React, { useState } from 'react'
import banner from '../assets/banner2.avif'
import bannerMobile from '../assets/banner-mobile.jpg'
import { useSelector } from 'react-redux'
import { valideURLConvert } from '../utils/valideURLConvert'
import {Link, useNavigate} from 'react-router-dom'
import CategoryWiseProductDisplay from '../components/CategoryWiseProductDisplay'
import DeliveryPartnerRegistration from '../components/DeliveryPartnerRegistration'

const Home = () => {
  const loadingCategory = useSelector(state => state.product.loadingCategory)
  const categoryData = useSelector(state => state.product.allCategory)
  const subCategoryData = useSelector(state => state.product.allSubCategory)
  const navigate = useNavigate()
  const [openDeliveryPartnerForm, setOpenDeliveryPartnerForm] = useState(false)

  const handleRedirectProductListpage = (id,cat)=>{
      console.log(id,cat)
      const subcategory = subCategoryData.find(sub =>{
        const filterData = sub.category.some(c => {
          return c._id == id
        })

        return filterData ? true : null
      })
      const url = `/${valideURLConvert(cat)}-${id}/${valideURLConvert(subcategory.name)}-${subcategory._id}`

      navigate(url)
      console.log(url)
  }


  return (
   <section className='bg-white'>
      <div className='container mx-auto'>
          <div className={`w-full h-full min-h-48 bg-blue-100 rounded ${!banner && "animate-pulse my-2" } `}>
              <img
                src={banner}
                className='w-full h-full hidden lg:block'
                alt='banner' 
              />
              <img
                src={bannerMobile}
                className='w-full h-full lg:hidden'
                alt='banner' 
              />
          </div>
      </div>

      {/* Delivery Partner Registration Button */}
      <div className='container mx-auto px-4 my-4'>
        <div className='bg-green-50 border border-green-200 rounded-lg p-4 text-center'>
          <h3 className='text-lg font-semibold text-green-800 mb-2'>Join Our Delivery Team!</h3>
          <p className='text-green-600 mb-3'>Earn money by delivering orders in your area</p>
          <button 
            onClick={() => setOpenDeliveryPartnerForm(true)}
            className='bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition-colors'
          >
            Register as Delivery Partner
          </button>
        </div>
      </div>
      
      <div className='container mx-auto px-4 my-2 grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10  gap-2'>
          {
            loadingCategory ? (
              new Array(12).fill(null).map((c,index)=>{
                return(
                  <div key={index+"loadingcategory"} className='bg-white rounded p-4 min-h-36 grid gap-2 shadow animate-pulse'>
                    <div className='bg-blue-100 min-h-24 rounded'></div>
                    <div className='bg-blue-100 h-8 rounded'></div>
                  </div>
                )
              })
            ) : (
              categoryData.map((cat,index)=>{
                return(
                  <div key={cat._id+"displayCategory"} className='w-full h-full' onClick={()=>handleRedirectProductListpage(cat._id,cat.name)}>
                    <div>
                        <img 
                          src={cat.image}
                          className='w-full h-full object-scale-down'
                        />
                    </div>
                  </div>
                )
              })
              
            )
          }
      </div>

      {/***display category product */}
      {
        categoryData?.map((c,index)=>{
          return(
            <CategoryWiseProductDisplay 
              key={c?._id+"CategorywiseProduct"} 
              id={c?._id} 
              name={c?.name}
            />
          )
        })
      }

      {/* Delivery Partner Registration Modal */}
      {
        openDeliveryPartnerForm && (
          <DeliveryPartnerRegistration close={() => setOpenDeliveryPartnerForm(false)} />
        )
      }

   </section>
  )
}

export default Home
