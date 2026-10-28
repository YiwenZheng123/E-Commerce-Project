import { Alert, AlertTitle } from '@mui/material'
import React from 'react'

const PaypalPayment = () => {
  return (
    <div className='h-96 flex justify-center items-center'>
      <Alert severity='warning' variant='filled' style={{maxWidth: "400px"}}>
        <AlertTitle>Paypal Method Unavailable</AlertTitle>
        Paypal payment method is currently unavailable. Please try again later.
      </Alert>
    </div>
  )
}

export default PaypalPayment