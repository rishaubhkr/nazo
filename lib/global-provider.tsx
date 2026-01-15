'use client'
import { Models } from 'appwrite';
import React, { createContext, useEffect, useState } from 'react'
import { getUser } from './actions/auth.actions';
import { redirect } from 'next/navigation';

const globalContext = createContext<Models.User | undefined>(undefined);

const GlobalProvider = ({children}:{children: React.ReactNode}) => {
    const [user, setUser] = useState<Models.User>()

    useEffect(() => {
        const fetchUser = async () => {
            const user = await getUser();
            if(user){
                setUser(user)
            } else {
                redirect('/login')
            }
        }
        fetchUser()
    }, [])
  return (
    <globalContext.Provider value={user}>
        {children}
    </globalContext.Provider>
  )
}

export default GlobalProvider