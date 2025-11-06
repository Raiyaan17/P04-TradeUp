'use client'
import { useState, useEffect } from 'react';
import TopBar from '@/components/topbar';
import { useRouter } from 'next/navigation';

export default function portfolio() {

    const router = useRouter();
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('access_token');
            if (!token) {
                setTimeout(() => {
                    router.push('/');
                }, 150);
            } else {
                setTimeout(() => {
                    setLoading(false);;
                }, 150);
            }
        }
    }, []);

    if (loading) {
        return (
            <div className='min-h-screen bg-[#111418] flex items-center justify-center'>
                <span className='text-white text-xl'>Loading...</span>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-[#111418]'>
            <TopBar/>
            <div id='container' className='flex justify-center gap-10 mt-18'>
                <div className='bg-[#181B20] text-white rounded-3xl flex flex-col w-90 h-120 p-7 gap-4'>
                    <h1 className='font-semibold text-3xl mb-10'>Portfolio</h1>
                    <h2>Total Balance</h2>
                    <h3 className='text-6xl mb-40'>{total}</h3>
                    <div className='flex justify-center gap-5'>
                        <button className='bg-[#22c55e] rounded-lg w-40 h-12 cursor-pointer'>Deposit</button>
                        <button className='bg-[#ef4444] rounded-lg w-40 h-12 cursor-pointer'>Withdraw</button>
                    </div>
                </div>
                <div className='bg-[#181B20] text-white rounded-3xl flex flex-col w-230 h-120 p-7 gap-4'>
                    <h1 className='font-semibold text-3xl mb-10'>Holdings</h1>
                    <table className='text-left'>
                        <thead >
                            <tr>
                                <th className='py-5'>Symbol</th>
                                <th>Name</th>
                                <th>Shares</th>
                                <th>Current</th>
                                <th>P/L</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className='border-t border-[#23262A]'>
                                <td className='py-5'>BTC</td>
                                <td>Bitcoin</td>
                                <td>0.5</td>
                                <td>$17,000</td>
                                <td>+$1,000</td>
                            </tr>
                            <tr className='border-t border-[#23262A]'>
                                <td className='py-5'>ETH</td>
                                <td>Ethereum</td>
                                <td>2</td>
                                <td>$7,000</td>
                                <td>+$500</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}