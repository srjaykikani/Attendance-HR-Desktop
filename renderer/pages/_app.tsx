import React from 'react'
import type { AppProps } from 'next/app'
import { Toaster } from 'sonner'

import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster position="top-center" richColors />
    </>
  )
}

export default MyApp