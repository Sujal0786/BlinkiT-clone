import Axios from "./Axios"
import SummaryApi from "../common/SummaryApi"

const fetchUserDetails = async()=>{
    try {
        const response = await Axios({
            ...SummaryApi.userDetails
        })
        return response.data
    } catch (error) {
        // Return null for unauthenticated users instead of throwing
        if (error.response && error.response.status === 401) {
            return null
        }
        console.log('Error fetching user details:', error)
        return null
    }
}

export default fetchUserDetails